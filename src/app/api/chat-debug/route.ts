export async function GET() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  return Response.json({
    hasKey: !!key,
    keyLength: key?.length ?? 0,
    keyPrefix: key?.substring(0, 5) ?? 'none',
    env: process.env.NODE_ENV,
  })
}
