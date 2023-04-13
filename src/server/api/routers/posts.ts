import { type User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
    firstName: user.firstName,
  };
};
export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
			orderBy: {
				createdAt: "desc"
			}
    });

    const users = (
      await clerkClient.users.getUserList({
        userId: posts.map((post) => post.authorId),
        limit: 100,
      })
    ).map(filterUserForClient);

    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);

      if (!author) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return { post, author };
    });
  }),
  create: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
			const authorId = ctx.currentUser;
			const lastPost = await ctx.prisma.post.findFirst({
				where: {
					authorId: {
						equals: authorId
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			})

			// User cannot create more than 1 post per minute
			if (lastPost) {
				const currentTime = Date.now();
				if (currentTime - lastPost.createdAt.valueOf() <= 60000) {
					throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
				}
			}
      const post = await ctx.prisma.post.create({
        data: {
          authorId,
          content: input.content,
        },
      });
      return post;
    }),
});
