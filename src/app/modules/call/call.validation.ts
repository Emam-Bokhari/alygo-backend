import { z } from "zod";
import { CALL_TYPE, COMMUNICATION_TYPE } from "./call.constant";

const initiateCallValidationSchema = z.object({
  body: z.object({
    communicationType: z.nativeEnum(COMMUNICATION_TYPE, {
      required_error: "communicationType is required",
    }),
    referenceId: z.string({
      required_error: "referenceId is required",
    }),
    receiverId: z.string({
      required_error: "receiverId is required",
    }),
    callType: z.nativeEnum(CALL_TYPE).default(CALL_TYPE.VOICE).optional(),
  }),
});

const answerCallValidationSchema = z.object({
  body: z.object({
    callId: z.string({
      required_error: "callId is required",
    }),
  }),
});

const rejectCallValidationSchema = z.object({
  body: z.object({
    callId: z.string({
      required_error: "callId is required",
    }),
    reason: z.string().optional(),
  }),
});

const cancelCallValidationSchema = z.object({
  body: z.object({
    callId: z.string({
      required_error: "callId is required",
    }),
  }),
});

const endCallValidationSchema = z.object({
  body: z.object({
    callId: z.string({
      required_error: "callId is required",
    }),
  }),
});

const getCallTokenValidationSchema = z.object({
  body: z.object({
    callId: z.string({
      required_error: "callId is required",
    }),
  }),
});

export const callValidation = {
  initiateCallValidationSchema,
  answerCallValidationSchema,
  rejectCallValidationSchema,
  cancelCallValidationSchema,
  endCallValidationSchema,
  getCallTokenValidationSchema,
};
