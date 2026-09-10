import { POST as loginHandler } from "../login/route";

export async function POST(request: Request) {
  return loginHandler(request);
}