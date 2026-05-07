import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import SocialMedia from "./SocialMedia";

const mockUseApp = jest.fn();
const mockIo = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("socket.io-client", () => ({
  __esModule: true,
  default: (...args) => mockIo(...args),
}));

describe("SocialMedia", () => {
  let socketHandlers;
  let socketMock;
  let apiCallMock;

  beforeEach(() => {
    socketHandlers = {};
    apiCallMock = jest.fn();
    socketMock = {
      on: jest.fn((event, handler) => {
        socketHandlers[event] = handler;
        return socketMock;
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIo.mockReset();
    mockIo.mockReturnValue(socketMock);

    mockUseApp.mockReturnValue({
      currentUser: {
        _id: "507f1f77bcf86cd799439011",
        id: "507f1f77bcf86cd799439011",
        name: "Asha Menon",
        email: "asha@example.com",
        avatar: "",
        following: [],
      },
      mockData: {
        socialMediaPosts: [
          {
            _id: "post-1",
            author: {
              _id: "507f1f77bcf86cd799439012",
              name: "Nikhil Das",
              avatar: "",
            },
            content: "Morning run with friends #fitness #kochi",
            likeCount: 12,
            commentCount: 3,
            shareCount: 1,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
        ],
        socialMediaStories: [
          {
            _id: "story-1",
            name: "Nikhil Das",
            stories: [
              {
                _id: "story-item-1",
                content: "Sunrise updates",
                createdAt: "2026-05-07T06:00:00.000Z",
              },
            ],
          },
        ],
        conversations: [
          {
            _id: "conversation-1",
            name: "Meera Thomas",
            lastMessage: "See you at the meetup!",
            unread: true,
          },
        ],
      },
      apiCall: apiCallMock,
    });

    apiCallMock.mockImplementation((path, method) => {
      if (method === "GET" && path === "/socialmedia/feed") {
        return Promise.resolve({
          posts: [
            {
              _id: "feed-1",
              author: {
                _id: "507f1f77bcf86cd799439012",
                name: "Nikhil Das",
              },
              content: "Fresh feed post #fitness",
              likeCount: 15,
              commentCount: 4,
              shareCount: 2,
              createdAt: "2026-05-07T09:00:00.000Z",
            },
          ],
        });
      }

      if (method === "GET" && path === "/socialmedia/posts/drafts") {
        return Promise.resolve({ posts: [] });
      }

      if (method === "GET" && path === "/socialmedia/posts/scheduled") {
        return Promise.resolve({ posts: [] });
      }

      if (method === "POST" && path === "/socialmedia/users/507f1f77bcf86cd799439012/follow") {
        return Promise.resolve({ success: true });
      }

      return Promise.resolve({});
    });
  });

  test("boots the social workspace, reflects live socket state, and toggles follow state", async () => {
    render(<SocialMedia />);

    expect(mockIo).toHaveBeenCalled();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();

    act(() => {
      socketHandlers.connect?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/^live$/i)).toBeInTheDocument();
    });

    expect(socketMock.emit).toHaveBeenCalledWith("user_online", {
      userId: "507f1f77bcf86cd799439011",
    });

    expect(await screen.findByRole("heading", { level: 2, name: /your feed/i })).toBeInTheDocument();
    expect(screen.getByText(/fresh feed post/i)).toBeInTheDocument();
    expect(screen.getAllByText(/#fitness/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /follow/i }));

    await waitFor(() => {
      expect(apiCallMock).toHaveBeenCalledWith(
        "/socialmedia/users/507f1f77bcf86cd799439012/follow",
        "POST"
      );
    });

    expect(screen.getByRole("button", { name: /following/i })).toBeInTheDocument();
  });

  test("switches to notifications and renders generated notification content", async () => {
    render(<SocialMedia />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(await screen.findByRole("heading", { level: 2, name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/nikhil das liked a post/i)).toBeInTheDocument();
  });
});
