import { POST as registerHandler } from "../register/route";

export async function POST(request: Request) {
  return registerHandler(request);
}