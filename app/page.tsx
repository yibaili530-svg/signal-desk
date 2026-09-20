import Workspace from "./workspace";
import {authorized} from "@/lib/access";
import {redirect} from "next/navigation";
export default async function Page(){if(!await authorized())redirect("/login");return <Workspace mode="desk"/>;}
