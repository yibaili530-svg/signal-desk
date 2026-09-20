import Workspace from "./workspace";
import {authorized} from "@/lib/access";
export default async function Page(){return <Workspace mode="desk" demo={!await authorized()}/>;}
