export interface EvalCase {
  query: string;
  expectedFilePathIncludes: string;
}

export const evalCases: EvalCase[] = [
  { query: "where does the app store unread chat message counts", expectedFilePathIncludes: "chatSlice" },
  { query: "how does the navbar display the total number of unread messages", expectedFilePathIncludes: "NavBar" },
  { query: "how are real-time socket connections established and provided to the app", expectedFilePathIncludes: "SocketProvider" },
  { query: "where is the list of a user's ongoing conversations rendered", expectedFilePathIncludes: "ChatList" },
  { query: "how does the app manage the current user's profile data in redux", expectedFilePathIncludes: "userSlice" },
  { query: "where are pending connection requests stored in state", expectedFilePathIncludes: "requestSlice" },
  { query: "how does infinite scroll or pagination work for the feed", expectedFilePathIncludes: "Feed" },
  { query: "where is the redux store configured and combined", expectedFilePathIncludes: "appStore" },
  { query: "how does the app show toast notifications", expectedFilePathIncludes: "Toast" },
  { query: "where is the base API url constant defined", expectedFilePathIncludes: "constants" },
];