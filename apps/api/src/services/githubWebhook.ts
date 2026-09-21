export async function createGithubWebhook(
  owner: string,
  repo: string,
  accessToken: string
): Promise<number | null> {
  const webhookUrl = process.env.GITHUB_WEBHOOK_URL;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookUrl || !secret) {
    console.warn("GITHUB_WEBHOOK_URL or GITHUB_WEBHOOK_SECRET not set — skipping webhook creation");
    return null;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret,
        },
      }),
    });

    if (!res.ok) {
      console.error("Failed to create GitHub webhook:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { id: number };
    return data.id;
  } catch (err) {
    console.error("Error creating GitHub webhook:", err);
    return null;
  }
}