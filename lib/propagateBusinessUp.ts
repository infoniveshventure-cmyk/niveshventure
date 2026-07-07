import User from "@/models/User";

/**
 * propagateBusinessUp
 *
 * After a member invests `amount`, walk every ancestor in the binary
 * placement tree (via parentId) and atomically increment the correct
 * side's current/total business fields in the database.
 *
 * How the side is determined:
 *   - The investor's own `position` field tells us which side of their
 *     direct parent they sit on (e.g. "left" → investor is the LEFT
 *     child of parent).
 *   - As we move further up, each intermediate node's `position` field
 *     tells us which side of the next ancestor it sits on.
 *
 * Atomicity:
 *   Uses a MongoDB aggregation-pipeline update (MongoDB 4.2+ / Atlas),
 *   so the $inc and $max are applied in a single round-trip with no
 *   read-modify-write race condition.
 *
 * @param investorMemberId  memberId of the member who just invested
 * @param amount            investment amount in USD
 */
export async function propagateBusinessUp(
  investorMemberId: string,
  amount: number
): Promise<void> {
  if (!amount || amount <= 0) return;

  // Safety cap — prevents infinite loops in corrupted trees
  const MAX_DEPTH = 200;

  // Fetch only the minimal fields we need as we walk up
  type NodeRef = { memberId: string; parentId: string | null; position: "left" | "right" | null };

  // Start from the investor
  let current: NodeRef | null = await User.findOne(
    { memberId: investorMemberId },
    { memberId: 1, parentId: 1, position: 1, _id: 0 }
  ).lean();

  let depth = 0;

  while (current && current.parentId && current.position && depth < MAX_DEPTH) {
    const side = current.position; // "left" or "right" — which side of the parent
    const parentMemberId = current.parentId;

    // Atomically update the parent's business fields using an aggregation pipeline.
    // Stage 1: increment the correct current-business field.
    // Stage 2: ensure total-business is always the high-water mark.
    if (side === "left") {
      await User.findOneAndUpdate(
        { memberId: parentMemberId },
        [
          {
            $set: {
              leftCurrentBusiness: { $add: [{ $ifNull: ["$leftCurrentBusiness", 0] }, amount] },
            },
          },
          {
            $set: {
              leftTotalBusiness: {
                $max: [{ $ifNull: ["$leftTotalBusiness", 0] }, "$leftCurrentBusiness"],
              },
            },
          },
        ],
        { new: false, updatePipeline: true } // we don't need the returned doc — fire-and-forget style
      );
    } else {
      await User.findOneAndUpdate(
        { memberId: parentMemberId },
        [
          {
            $set: {
              rightCurrentBusiness: { $add: [{ $ifNull: ["$rightCurrentBusiness", 0] }, amount] },
            },
          },
          {
            $set: {
              rightTotalBusiness: {
                $max: [{ $ifNull: ["$rightTotalBusiness", 0] }, "$rightCurrentBusiness"],
              },
            },
          },
        ],
        { new: false, updatePipeline: true }
      );
    }

    // Move one level up: fetch the parent node to continue the walk
    current = await User.findOne(
      { memberId: parentMemberId },
      { memberId: 1, parentId: 1, position: 1, _id: 0 }
    ).lean();

    depth++;
  }
}
