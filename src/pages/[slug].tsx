import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import { LoadingPage } from "~/components/loading";
import { api } from "~/utils/api";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import superjson from "superjson";
import { type GetServerSideProps, type GetStaticProps } from "next";
import { createServerSideHelpers } from "@trpc/react-query/server";

const ProfilePage = () => {
  const router = useRouter();
  const { slug } = router.query;
  if (!slug) return <div>User not found</div>;

  const username = slug.slice(1) as string;
  const { data, isLoading } = api.profile.getUserByUsername.useQuery({ username });
	
	if (isLoading) return <LoadingPage />
	if (!data) return <div>404</div>

	return (
    <>
      <Head>
        <title>Chirp</title>
      </Head>
      <div>{data.username}</div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
	const ssg = createServerSideHelpers({
    router: appRouter,
    ctx: { prisma, currentUser: null },
    transformer: superjson,
  });

	const slug = context.params?.slug;

	if (typeof slug !== "string") throw new Error("no slug");

	await ssg.profile.getUserByUsername.prefetch({ username: slug.slice(1) })
	return {
		props: {
			trpcState: ssg.dehydrate()
		}
	}
}

export default ProfilePage;
