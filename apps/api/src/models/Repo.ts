import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IRepo extends Document {
  userId: Types.ObjectId;
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  connectedAt: Date;
  lastIndexedAt?: Date;
  chunkCount?: number;
  githubWebhookId?: number;
  fileCount?: number;
}

const repoSchema = new Schema<IRepo>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  githubRepoId: { type: Number, required: true },
  name: { type: String, required: true },
  fullName: { type: String, required: true },
  owner: { type: String, required: true },
  defaultBranch: { type: String, required: true },
  private: { type: Boolean, required: true, default: false },
  htmlUrl: { type: String, required: true },
  connectedAt: { type: Date, required: true, default: () => new Date() },
  lastIndexedAt: { type: Date },
  chunkCount: { type: Number },
  githubWebhookId: { type: Number },
  fileCount: { type: Number },
});

repoSchema.index({ userId: 1, githubRepoId: 1 }, { unique: true });

export const Repo: Model<IRepo> =
  mongoose.models.Repo || mongoose.model<IRepo>("Repo", repoSchema);