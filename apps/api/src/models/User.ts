import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  githubId: number;
  username: string;
  avatarUrl: string;
  githubAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    githubId: { type: Number, required: true, unique: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    githubAccessToken: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// Prevents "Cannot overwrite model once compiled" when tsx's watch mode
// re-executes this module on file changes.
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);