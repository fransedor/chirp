import { type NextPage } from "next";
import Head from "next/head";
import { SignInButton, useUser } from "@clerk/nextjs";
import { type RouterOutputs, api } from "~/utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import LoadingSpinner, { LoadingPage } from "~/components/loading";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState("");
  const ctx = api.useContext();
  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      setInputValue("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  if (!user) return null;

  return (
    <div className="flex w-full items-center gap-3">
      <Image
        src={user.profileImageUrl}
        alt="Profile Image"
        width={56}
        height={56}
        className="rounded-full"
      />
      <input
        type="text"
        placeholder="Type some text!"
        className="grow bg-transparent focus:outline-none"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isPosting}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (inputValue !== "") {
              mutate({ content: inputValue });
            }
          }
        }}
      />
      {isPosting ? (
        <LoadingSpinner></LoadingSpinner>
      ) : (
        <button
          onClick={() => mutate({ content: inputValue })}
          disabled={!inputValue}
        >
          Post
        </button>
      )}
    </div>
  );
};

type PostWithUser = RouterOutputs["posts"]["getAll"][number];
const PostView = (props: PostWithUser) => {
  const { post, author } = props;

  return (
    <Link href={`/post/${post.id}`}>
      <div className="flex gap-3 border-b border-slate-400 p-4" key={post.id}>
        <Image
          src={author.profileImageUrl}
          width={56}
          height={56}
          alt="Profile Image"
          className="rounded-full"
        />
        <div className="flex flex-col">
          <div className="flex gap-1 text-slate-300">
            <Link
              href={`/@${author.username!}`}
            >
              <span>@{author.username}</span>
            </Link>
            <span>{"\u2022"}</span>
            <span className="font-thin">{dayjs(post.createdAt).fromNow()}</span>
          </div>
          <span>{post.content}</span>
        </div>
      </div>
    </Link>
  );
};

const Feed = () => {
  const { data, isFetched: postLoaded } = api.posts.getAll.useQuery();

  if (!postLoaded) return <LoadingPage />;

  if (!data) return <div>Something went wrong...</div>;
  return (
    <div className="flex flex-col">
      {data?.map((fullPost) => (
        <PostView {...fullPost} key={fullPost.post.id}></PostView>
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // Returns empty div if BOTH aren't loaded, since user tends to load faster
  if (!userLoaded) return <div />;

  return (
    <>
      <main className="flex h-screen justify-center">
        <div className="h-full w-full border-x border-slate-400 md:max-w-2xl">
          <div className="flex justify-center border-b border-slate-400 p-4">
            {isSignedIn ? <CreatePostWizard /> : <SignInButton />}
          </div>
          <Feed />
        </div>
      </main>
    </>
  );
};

export default Home;
