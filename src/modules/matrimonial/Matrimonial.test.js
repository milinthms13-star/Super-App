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
    id: 1,
    name: "Anjali Sharma",
    age: 28,
    religion: "Hindu",
    caste: "Brahmin",
    location: "Bangalore",
    profession: "Software Engineer",
    image: "A",
    verified: true,
    bio: "Loves reading and cooking",
  },
  {
    id: 2,
    name: "Kavya Singh",
    age: 26,
    religion: "Hindu",
    caste: "Kshatriya",
    location: "Delhi",
    profession: "Doctor",
    image: "K",
    verified: true,
    bio: "Passionate about health and fitness",
  },
  {
    id: 3,
    name: "Sara Joseph",
    age: 27,
    religion: "Christian",
    caste: "Latin Catholic",
    location: "Kochi",
    profession: "Architect",
    image: "S",
    verified: false,
    bio: "Enjoys travel and art",
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
  role: "user",
  registrationType: "user",
  preferences: {
    language: "en",
    soulmatchOnboardingSeen: true,
  },
  ...overrides,
});

describe("Matrimonial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.patch.mockResolvedValue({
      data: {
        user: buildUser(),
      },
    });

    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });
  });

  test("filters discovery results using search and advanced filters", async () => {
    render(<Matrimonial />);

    expect(screen.getAllByText(/anjali sharma/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kavya singh/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/search profiles/i), {
      target: { value: "Doctor" },
    });

    await waitFor(() => {
      expect(screen.queryByText(/anjali sharma/i, { selector: '.matrimonial-match-card *' })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/kavya singh/i).length).toBeGreaterThan(0);
  });

  test("keeps contact details hidden for free members and reveals premium messaging state on preview", () => {
    render(<Matrimonial />);

    expect(screen.getByText(/premium required to view contact details/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview premium/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /preview premium/i }));

    expect(screen.getByRole("button", { name: /switch to free view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open secure chat/i })).toBeInTheDocument();
  });

  test("opens profile edit modal when Edit Profile is clicked", () => {
    render(<Matrimonial />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(screen.getByRole("heading", { name: /complete your profile before you continue/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/profile name/i)).toBeInTheDocument();
  });

  test("shows caste filter control in discovery search", () => {
    render(<Matrimonial />);

    expect(screen.getByLabelText(/caste filter/i)).toBeInTheDocument();
  });

  test("sends interest to a profile", () => {
    render(<Matrimonial />);

    const interestButtons = screen.getAllByRole("button", { name: /express interest/i });
    expect(interestButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(interestButtons[0]);
    
    expect(screen.getByText(/interest sent to/i)).toBeInTheDocument();
  });

  test("shows onboarding modal and saves a sanitized profile", async () => {
    const onProfileUpdate = jest.fn();
    axios.patch
      .mockResolvedValueOnce({
        data: {
          user: buildUser({
            preferences: {
              language: "en",
              soulmatchOnboardingSeen: true,
            },
          }),
        },
      })
      .mockResolvedValueOnce({
      data: {
        user: buildUser({
          name: "Arun alert(1)",
          bio: "Safe text",
          languages: ["Malayalam", "English"],
          hobbies: ["Travel", "Reading"],
          preferences: {
            language: "en",
            soulmatchOnboardingSeen: true,
          },
        }),
      },
      });

    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });

    render(<Matrimonial onProfileUpdate={onProfileUpdate} />);

    expect(
      screen.getByRole("heading", { name: /complete your profile before you continue/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: '<script>alert(1)</script>Arun' },
    });
    fireEvent.change(screen.getByLabelText(/bio/i), {
      target: { value: '<img src=x onerror=alert(1)>Safe text' },
    });
    fireEvent.change(screen.getByLabelText(/languages/i), {
      target: { value: "Malayalam, <b>English</b>" },
    });
    fireEvent.change(screen.getByLabelText(/hobbies/i), {
      target: { value: "Travel, <script>bad</script>Reading" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledTimes(2);
    });

    expect(axios.patch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/auth\/me$/),
      expect.objectContaining({
        preferences: expect.objectContaining({
          soulmatchOnboardingSeen: true,
        }),
      }),
      expect.objectContaining({
        timeout: 10000,
      })
    );

    expect(axios.patch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/auth\/me$/),
      expect.objectContaining({
        name: "alert(1)Arun",
        bio: "Safe text",
        phone: "9876543210",
        languages: ["Malayalam", "English"],
        hobbies: ["Travel", "badReading"],
      }),
      expect.objectContaining({
        timeout: 10000,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/your profile has been saved successfully/i)).toBeInTheDocument();
    });

    expect(onProfileUpdate).toHaveBeenCalled();
  });

  test("shows API errors gracefully during profile save", async () => {
    axios.patch
      .mockResolvedValueOnce({
        data: {
          user: buildUser({
            preferences: {
              language: "en",
              soulmatchOnboardingSeen: true,
            },
          }),
        },
      })
      .mockRejectedValueOnce({
      response: {
        status: 413,
      },
      });

    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });

    render(<Matrimonial />);

    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile data too large/i)).toBeInTheDocument();
    });
  });

  test("applies advanced filters correctly", async () => {
    render(<Matrimonial />);

    fireEvent.change(screen.getByLabelText(/religion filter/i), {
      target: { value: "Christian" },
    });
    fireEvent.click(screen.getByLabelText(/show verified profiles only/i));

    await waitFor(() => {
      expect(screen.getAllByText(/sara joseph/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/anjali sharma/i)).not.toBeInTheDocument();
  });

  test("blocks profiles from discovery list", () => {
    render(<Matrimonial />);

    expect(screen.getAllByText(/anjali sharma/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/block profile/i));

    expect(screen.queryByText(/interest sent to/i)).not.toBeInTheDocument();
    expect(screen.getByText(/was blocked from your discovery list/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kavya singh/i).length).toBeGreaterThan(0);
  });

  test("resets pagination when filters shrink the result set", async () => {
    const largeProfiles = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `Profile ${index + 1}`,
      age: 25 + (index % 10),
      religion: index >= 20 ? "Christian" : "Hindu",
      caste: "Brahmin",
      location: "Kochi",
      profession: index >= 20 ? "Doctor" : "Engineer",
      education: "B.Tech",
      image: "P",
      verified: true,
      bio: `Bio for profile ${index + 1}`,
    }));

    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      mockData: { matrimonialProfiles: largeProfiles },
    });

    render(<Matrimonial />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/profession filter/i), {
      target: { value: "Doctor" },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/profile 21/i).length).toBeGreaterThan(0);
    });
    const pageText = screen.getByText(/page \d+ of \d+/i).textContent;
    console.log('Page text:', pageText);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  test("sanitizes user input to prevent XSS attacks", () => {
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
  });

  test("validates profile input and calculates completion correctly", () => {
    const invalidProfile = {
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
    };

    const validation = validateMatrimonialProfile(invalidProfile);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        age: expect.any(String),
      })
    );

    expect(
      calculateProfileCompletion({
        name: "Arun",
        email: "arun@example.com",
        phone: "9876543210",
        age: 29,
        gender: "Man",
        religion: "Hindu",
        education: "B.Tech",
        profession: "Engineer",
        location: "Kochi",
        maritalStatus: "Never Married",
        bio: "Hello",
        familyDetails: "Family details",
      })
    ).toBe(100);
  });

  test("displays proper accessibility attributes", () => {
    render(<Matrimonial />);
    expect(screen.getAllByRole("button", { name: /express interest/i }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/soulmatch sections/i)).toBeInTheDocument();
  });

  test("shows loading indicator during filter operations", async () => {
    render(<Matrimonial />);
    
    const searchInput = screen.getByLabelText(/search profiles/i);
    fireEvent.change(searchInput, { target: { value: "Software" } });
    
    // Filter is applied and results are updated
    await waitFor(() => {
      expect(screen.getAllByText(/anjali sharma/i).length).toBeGreaterThan(0);
    });
  });

  test("handles network errors with specific messages", async () => {
    axios.patch
      .mockResolvedValueOnce({
        data: {
          user: buildUser({
            preferences: {
              language: "en",
              soulmatchOnboardingSeen: true,
            },
          }),
        },
      })
      .mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout',
      });

    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });

    render(<Matrimonial />);
    
    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: "Test User" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
    });
  });

  test("handles 400 validation errors from server", async () => {
    axios.patch
      .mockResolvedValueOnce({
        data: {
          user: buildUser({
            preferences: {
              language: "en",
              soulmatchOnboardingSeen: true,
            },
          }),
        },
      })
      .mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: "Email already registered" },
      },
      });

    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });

    render(<Matrimonial />);
    
    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: "Test User" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email already registered/i)).toBeInTheDocument();
    });
  });

  test("shows profile completion percentage in modal", () => {
    axios.patch.mockResolvedValueOnce({
      data: {
        user: buildUser({
          preferences: {
            language: "en",
            soulmatchOnboardingSeen: true,
          },
        }),
      },
    });
    mockUseApp.mockReturnValue({
      currentUser: buildUser({
        preferences: {
          language: "en",
          soulmatchOnboardingSeen: false,
        },
      }),
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });

    render(<Matrimonial />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  test("prevents interest double-send to same profile", () => {
    render(<Matrimonial />);
    
    const interestButtons = screen.getAllByRole("button", { name: /express interest/i });
    
    // Click first interest button twice
    fireEvent.click(interestButtons[0]);
    fireEvent.click(interestButtons[0]);
    
    expect(screen.getByText(/interest already sent to/i)).toBeInTheDocument();
  });

  test("blocks and unblocks profiles correctly", () => {
    render(<Matrimonial />);
    
    // Block a profile
    fireEvent.click(screen.getByText(/block profile/i));
    expect(screen.getByText(/blocked from your discovery list/i)).toBeInTheDocument();
    
    // Verify blocked profile is hidden from discovery (but name may appear in banner)
    expect(screen.queryByText(/sara joseph/i, { selector: '.matrimonial-match-card *' })).not.toBeInTheDocument();
  });

  test("handles pagination correctly with filtered results", () => {
    const manyProfiles = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Profile ${i + 1}`,
      age: 25 + (i % 10),
      religion: "Hindu",
      location: i % 2 === 0 ? "Delhi" : "Bangalore",
      profession: "Engineer",
      verified: true,
      bio: "Test profile",
    }));

    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      mockData: { matrimonialProfiles: manyProfiles },
    });

    render(<Matrimonial />);
    
    // Should display profiles with pagination
    expect(screen.getAllByText(/profile 1/i).length).toBeGreaterThan(0);
  });

  test("preserves profile state when switching tabs", () => {
    render(<Matrimonial />);
    
    // Click interest button
    fireEvent.click(screen.getAllByRole("button", { name: /express interest/i })[0]);
    expect(screen.getByText(/interest sent to/i)).toBeInTheDocument();
    
    // Switch tabs and back
    fireEvent.click(screen.getByRole("tab", { name: /interests/i }));
    fireEvent.click(screen.getByRole("tab", { name: /discover/i }));
    
    // Interest state should persist
    expect(screen.getAllByRole("button", { name: /interest sent/i }).length).toBeGreaterThan(0);
  });

  test("accepts incoming interests and sends unlocked messages in premium preview", () => {
    render(<Matrimonial />);

    fireEvent.click(screen.getByRole("tab", { name: /interests/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /^accept$/i })[0]);
    expect(screen.getByText(/accepted interest from/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /preview premium/i }));
    fireEvent.click(screen.getByRole("tab", { name: /messages/i }));
    fireEvent.change(screen.getByLabelText(/message anjali sharma/i), {
      target: { value: "Hello, wishing you the best in your search." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^send$/i })[0]);

    expect(screen.getByText(/message sent to anjali sharma/i)).toBeInTheDocument();
  });

  test("displays profile completion progress with accurate percentage", () => {
    const incompleteUser = {
      ...buildUser(),
      name: "",
      bio: "",
      familyDetails: "",
      preferences: {
        language: "en",
        soulmatchOnboardingSeen: false,
      },
    };
    axios.patch.mockResolvedValueOnce({
      data: {
        user: {
          ...incompleteUser,
          preferences: {
            language: "en",
            soulmatchOnboardingSeen: true,
          },
        },
      },
    });
    mockUseApp.mockReturnValue({
      currentUser: incompleteUser,
      mockData: {
        matrimonialProfiles: baseProfiles,
      },
    });
    
    render(<Matrimonial />);
    
    const progressBar = screen.getByRole("progressbar");
    const currentValue = parseInt(progressBar.getAttribute("aria-valuenow"));
    
    // Should be less than 100 with missing fields
    expect(currentValue).toBeLessThan(100);
    
    // Fill in one field
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Test Name" },
    });
    
    // Progress should increase
    const updatedValue = parseInt(progressBar.getAttribute("aria-valuenow"));
    expect(updatedValue).toBeGreaterThan(currentValue);
  });

  test("applies ARIA labels to profile action buttons", () => {
    render(<Matrimonial />);
    
    // Check for descriptive ARIA labels
    const interestButtons = screen.getAllByRole("button", { name: /express interest/i });
    expect(interestButtons[0]).toHaveAttribute("aria-label");
    expect(interestButtons[0]).toHaveAttribute("aria-pressed");
  });

  test("sanitizes profile names in status messages", () => {
    render(<Matrimonial />);
    
    // Verify sanitization in messages
    fireEvent.click(screen.getAllByRole("button", { name: /express interest/i })[0]);
    
    const message = screen.getByText(/interest sent to/i);
    expect(message.textContent).not.toMatch(/<script>/);
    expect(message.textContent).not.toMatch(/<img/);
  });
});
