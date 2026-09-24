import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IGraphEdge extends Document {
  repoId: Types.ObjectId;
  from: string;
  to: string;
}

const graphEdgeSchema = new Schema<IGraphEdge>({
  repoId: { type: Schema.Types.ObjectId, ref: "Repo", required: true, index: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
});

export const GraphEdge: Model<IGraphEdge> =
  mongoose.models.GraphEdge || mongoose.model<IGraphEdge>("GraphEdge", graphEdgeSchema);