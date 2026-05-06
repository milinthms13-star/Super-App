import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import Matrimonial from "./Matrimonial";
import {
  calculateProfileCompletion,
  sanitizeProfileData,
  validateMatrimonialProfile,
} from "./validators";

const mockUseApp = jest.fn();

jest.mock("axios");
jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

const baseProfiles = [
  {
    id: "profile-1",
    name: "Anjali Sharma",
    age: 28,
    religion: "Hindu",
    caste: "Brahmin",
    community: "Malayali",
    location: "Bangalore",
    profession: "Software Engineer",
    education: "B.Tech",
    image: "A",
    verified: true,
    verificationStatus: "verified",
    profileStatus: "approved",
    bio: "Loves reading and cooking",
    familyDetails: "Family oriented",
    maritalStatus: "Never Married",
    languages: ["Malayalam", "English"],
    hobbies: ["Reading"],
    privacy: {
      hidePhone: false,
      hidePhotos: false,
      premiumOnlyContact: true,
    },
    premiumOnlyContact: true,
    contactVisibility: "premium_required",
    phone: "",
    profileViews: 52,
    lastActive: "2026-05-07T08:00:00.000Z",
    lastActiveLabel: "2h ago",
  },
  {
    id: "profile-2",
    name: "Kavya Singh",
    age: 26,
    religion: "Hindu",
    caste: "Kshatriya",
    community: "Punjabi",
    location: "Delhi",
    profession: "Doctor",
    education: "MBBS",
    image: "K",
    verified: true,
    verificationStatus: "verified",
    profileStatus: "approved",
    bio: "Passionate about health and fitness",
    familyDetails: "Close-knit family",
    maritalStatus: "Never Married",
    languages: ["Hindi", "English"],
    hobbies: ["Fitness"],
    privacy: {
      hidePhone: true,
      hidePhotos: true,
      premiumOnlyContact: false,
    },
    premiumOnlyContact: false,
    contactVisibility: "hidden",
    phone: "",
    profileViews: 61,
    lastActive: "2026-05-07T09:00:00.000Z",
    lastActiveLabel: "1h ago",
  },
];

const buildUser = (overrides = {}) => ({
  name: "Arun Menon",
  email: "arun@example.com",
  phone: "+91 9876543210",
  age: 29,
  gender: "Man",
  religion: "Hindu",
  caste: "Nair",
  community: "Malayali",
  education: "B.Tech",
  profession: "Product Manager",
  location: "Kochi",
  maritalStatus: "Never Married",
  familyDetails: "Family details",
  bio: "Bio",
  role: "user",
  registrationType: "user",
  preferences: {
    language: "en",
    soulmatchOnboardingSeen: true,
  },
  ...overrides,
});

const configureLiveAxios = ({
  profile = null,
  searchProfiles = baseProfiles,
  interests = { incoming: [], outgoing: [] },
  threads = [],
  adminQueue = { summary: { verifiedCount: 0, pendingCount: 0, reportCount: 0, premiumCount: 0 }, profiles: [] },
} = {}) => {
  let currentInterests = interests;

  axios.get.mockImplementation((url) => {
    if (/\/matrimonial\/profile$/.test(url)) {
      return Promise.resolve({ data: { data: profile } });
    }

    if (/\/matrimonial\/search/.test(url)) {
      return Promise.resolve({ data: { data: searchProfiles } });
    }

    if (/\/matrimonial\/interests$/.test(url)) {
      return Promise.resolve({ data: { data: currentInterests } });
    }

    if (/\/matrimonial\/messages$/.test(url)) {
      return Promise.resolve({ data: { data: threads } });
    }

    if (/\/matrimonial\/admin\/review-queue$/.test(url)) {
      return Promise.resolve({ data: { data: adminQueue } });
    }

    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });

  axios.post.mockImplementation((url, body) => {
    if (/\/matrimonial\/interests$/.test(url)) {
      currentInterests = {
        incoming: [],
        outgoing: [
          {
            id: "interest-1",
            status: "sent",
            message: "",
            toProfileId: body.toProfileId,
            toProfile: baseProfiles[0],
            fromProfileId: "self",
            createdAt: "2026-05-07T10:00:00.000Z",
          },
        ],
      };

      return Promise.resolve({ data: { success: true } });
    }

    if (/\/report$/.test(url) || /\/block$/.test(url) || /\/matrimonial\/messages$/.test(url)) {
      return Promise.resolve({ data: { success: true } });
    }

    return Promise.reject(new Error(`Unhandled POST ${url}`));
  });

  axios.put.mockResolvedValue({
    data: {
      data: {
        ...(profile || {}),
        ...buildUser(),
        id: "self-profile",
        userId: "user-1",
        verificationStatus: "pending",
        profileStatus: "pending_review",
        privacy: {
          hidePhone: false,
          hidePhotos: false,
          premiumOnlyContact: false,
        },
        languages: ["Malayalam", "English"],
        hobbies: ["Travel", "Reading"],
      },
      user: buildUser(),
    },
  });

  axios.patch.mockImplementation((url) => {
    if (/\/auth\/me$/.test(url)) {
      return Promise.resolve({
        data: {
          user: buildUser(),
        },
      });
    }

    if (/\/matrimonial\/interests\//.test(url) || /\/moderation$/.test(url)) {
      return Promise.resolve({ data: { success: true } });
    }

    return Promise.reject(new Error(`Unhandled PATCH ${url}`));
  });
};

describe("Matrimonial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureLiveAxios();

    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      mockData: {
        matrimonialProfiles: [],
      },
    });
  });

  test("loads live discovery data from the matrimonial API", async () => {
    render(<Matrimonial />);

    await waitFor(() => {
      expect(screen.getAllByText(/anjali sharma/i).length).toBeGreaterThan(0);
    });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/matrimonial\/search\?/),
      expect.objectContaining({
        timeout: 10000,
      })
    );
  });

  test("saves a sanitized profile through the live matrimonial profile endpoint", async () => {
    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: [],
      },
    });

    render(<Matrimonial />);

    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: "<script>alert(1)</script>Arun" },
    });
    fireEvent.change(screen.getByLabelText(/bio/i), {
      target: { value: "<img src=x onerror=alert(1)>Safe text" },
    });
    fireEvent.change(screen.getByLabelText(/languages/i), {
      target: { value: "Malayalam, <b>English</b>" },
    });
    fireEvent.change(screen.getByLabelText(/hobbies/i), {
      target: { value: "Travel, <script>bad</script>Reading" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = axios.put.mock.calls[0][1];
    expect(submittedFormData.get("name")).toBe("alert(1)Arun");
    expect(submittedFormData.get("bio")).toBe("Safe text");
    expect(submittedFormData.get("phone")).toBe("9876543210");
    expect(submittedFormData.get("languages")).toBe("Malayalam, English");
    expect(submittedFormData.get("hobbies")).toBe("Travel, badReading");
    expect(axios.put.mock.calls[0][0]).toMatch(/\/matrimonial\/profile$/);
  });

  test("sends interests through the live API and reflects the updated state", async () => {
    render(<Matrimonial />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /express interest/i }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /express interest/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/interest sent to/i)).toBeInTheDocument();
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/matrimonial\/interests$/),
      expect.objectContaining({
        toProfileId: "profile-1",
      }),
      expect.objectContaining({
        timeout: 10000,
      })
    );
  });

  test("renders the live moderation queue and submits moderation actions", async () => {
    configureLiveAxios({
      adminQueue: {
        summary: {
          verifiedCount: 8,
          pendingCount: 3,
          reportCount: 2,
          premiumCount: 4,
        },
        profiles: [baseProfiles[0]],
      },
    });

    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        role: "admin",
        registrationType: "admin",
      }),
      mockData: {
        matrimonialProfiles: [],
      },
    });

    render(<Matrimonial />);

    fireEvent.click(screen.getByRole("tab", { name: /admin/i }));

    await waitFor(() => {
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getAllByText(/anjali sharma/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringMatching(/\/matrimonial\/admin\/profiles\/profile-1\/moderation$/),
        expect.objectContaining({
          action: "approve",
        }),
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });
  });

  test("falls back to demo profiles when the live search request fails", async () => {
    axios.get.mockImplementation((url) => {
      if (/\/matrimonial\/profile$/.test(url)) {
        return Promise.resolve({ data: { data: null } });
      }

      if (/\/matrimonial\/search/.test(url)) {
        return Promise.reject(new Error("search down"));
      }

      if (/\/matrimonial\/interests$/.test(url)) {
        return Promise.resolve({ data: { data: { incoming: [], outgoing: [] } } });
      }

      if (/\/matrimonial\/messages$/.test(url)) {
        return Promise.resolve({ data: { data: [] } });
      }

      return Promise.resolve({ data: { data: { summary: {}, profiles: [] } } });
    });

    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      mockData: {
        matrimonialProfiles: [
          {
            id: 1,
            name: "Fallback Member",
            age: 27,
            religion: "Hindu",
            caste: "Nair",
            location: "Kochi",
            profession: "Engineer",
            education: "B.Tech",
            verified: true,
            bio: "Fallback bio",
          },
        ],
      },
    });

    render(<Matrimonial />);

    await waitFor(() => {
      expect(screen.getAllByText(/fallback member/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/showing demo profiles while the live matchmaking service is unavailable/i)).toBeInTheDocument();
    });
  });

  test("sanitizes user input and validates completion helpers", () => {
    const sanitized = sanitizeProfileData({
      name: "<script>alert(1)</script>Arun",
      email: " TEST@EXAMPLE.COM ",
      phone: "+91 98765-43210",
      religion: "<b>Hindu</b>",
      caste: "Nair",
      community: "Malayali",
      education: "B.Tech",
      profession: "Engineer",
      location: "Kochi",
      maritalStatus: "Never Married",
      bio: '<img src=x onerror=alert(1)>Safe text',
      familyDetails: "<div>Family</div>",
      languages: "Malayalam, <b>English</b>",
      hobbies: "Travel, <script>bad</script>Reading",
    });

    expect(sanitized.name).toBe("alert(1)Arun");
    expect(sanitized.email).toBe("test@example.com");
    expect(sanitized.phone).toBe("9876543210");
    expect(sanitized.bio).toBe("Safe text");
    expect(sanitized.languages).toEqual(["Malayalam", "English"]);
    expect(sanitized.hobbies).toEqual(["Travel", "badReading"]);

    const validation = validateMatrimonialProfile({
      name: "",
      email: "bad-email",
      phone: "123",
      age: 17,
      gender: "",
      religion: "",
      education: "",
      profession: "",
      location: "",
      maritalStatus: "",
      familyDetails: "",
      bio: "",
    });

    expect(validation.isValid).toBe(false);
    expect(calculateProfileCompletion(buildUser())).toBe(100);
  });
});
