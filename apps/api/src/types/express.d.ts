// Extends Express's own Request type via declaration merging — the same
// pattern @types/express itself uses internally. This makes req.rawBody
// a recognized property everywhere in the app without needing a cast.
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export {};