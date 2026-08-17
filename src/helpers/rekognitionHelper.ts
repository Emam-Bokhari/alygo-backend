import {
  RekognitionClient,
  CompareFacesCommand,
} from "@aws-sdk/client-rekognition";
import config from "../config";
import ApiError from "../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

let rekognitionClient: RekognitionClient | null = null;

const getRekognitionClient = (): RekognitionClient => {
  if (!rekognitionClient) {
    rekognitionClient = new RekognitionClient({
      region: config.aws.region || "us-east-1",
      credentials: {
        accessKeyId: config.aws.accessKeyId || "",
        secretAccessKey: config.aws.secretAccessKey || "",
      },
    });
  }
  return rekognitionClient;
};

export const compareFaces = async (
  sourceImage: Buffer,
  targetImage: Buffer,
  similarityThreshold: number = 80,
) => {
  try {
    const client = getRekognitionClient();

    const command = new CompareFacesCommand({
      SourceImage: {
        Bytes: sourceImage,
      },
      TargetImage: {
        Bytes: targetImage,
      },
      SimilarityThreshold: similarityThreshold,
    });

    const response = await client.send(command);

    const match = !!(response.FaceMatches && response.FaceMatches.length > 0);
    const similarity = match ? (response.FaceMatches![0]?.Similarity ?? 0) : 0;

    return {
      match,
      similarity,
      confidence: similarity,
    };
  } catch (error: any) {
    console.error("Error comparing faces:", error);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Face comparison failed");
  }
};
