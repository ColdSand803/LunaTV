import type { Env, ExecutionContext } from '@cloudflare/workers-types';
import { fetchNextRequest } from '@opennextjs/cloudflare/worker';

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return fetchNextRequest(request, env, ctx);
  },
};

export default worker;
