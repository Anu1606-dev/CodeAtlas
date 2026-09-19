import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IChunk extends Document {
  repoId: Types.ObjectId;
  userId: Types.ObjectId;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  content: string;
  embedding: number[];
  createdAt: Date;
}

const chunkSchema = new Schema<IChunk>({
  repoId: { type: Schema.Types.ObjectId, ref: "Repo", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  filePath: { type: String, required: true },
  language: { type: String, required: true },
  startLine: { type: Number, required: true },
  endLine: { type: Number, required: true },
  symbolName: { type: String },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, required: true, default: () => new Date() },
});

export const Chunk: Model<IChunk> =
  mongoose.models.Chunk || mongoose.model<IChunk>("Chunk", chunkSchema);