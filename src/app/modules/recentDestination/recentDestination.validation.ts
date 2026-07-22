import { z } from "zod";

// No validation schemas needed for GET/DELETE endpoints
// They only use route parameters

export const RecentDestinationValidations = {
  // No validation schemas needed for this feature
  // GET /recent-destinations - no body
  // DELETE /recent-destinations/:id - no body
  // DELETE /recent-destinations - no body
};
