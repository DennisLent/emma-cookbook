import { expect, test } from "@playwright/test";

test("recipe detail shows persisted suggested sides and sauces", async ({ page, request }) => {
  const username = `e2e_${Date.now()}`;
  const password = "StrongPass123!";

  await request.post("http://127.0.0.1:8000/api/auth/register/", {
    data: {
      username,
      password,
      password2: password,
      name: "E2E Tester",
    },
  });

  const tokenResponse = await request.post("http://127.0.0.1:8000/api/auth/token/", {
    data: { username, password },
  });
  const tokens = await tokenResponse.json();

  const authHeaders = {
    Authorization: `Bearer ${tokens.access}`,
  };

  const sideResponse = await request.post("http://127.0.0.1:8000/api/recipes/", {
    headers: authHeaders,
    data: {
      title: "Crisp Salad",
      servings: 2,
      isSide: true,
      ingredients: [{ item: "lettuce" }],
      steps: [{ order: 1, text: "Toss lettuce" }],
      tags: ["Side"],
    },
  });
  const side = await sideResponse.json();

  const sauceResponse = await request.post("http://127.0.0.1:8000/api/recipes/", {
    headers: authHeaders,
    data: {
      title: "Herb Sauce",
      servings: 2,
      isSauce: true,
      ingredients: [{ item: "yogurt" }],
      steps: [{ order: 1, text: "Mix sauce" }],
      tags: ["Sauce"],
    },
  });
  const sauce = await sauceResponse.json();

  await request.post("http://127.0.0.1:8000/api/recipes/", {
    headers: authHeaders,
    data: {
      title: "Roast Chicken Plate",
      description: "Dinner with suggestions",
      servings: 4,
      ingredients: [{ item: "chicken" }],
      steps: [{ order: 1, text: "Roast chicken" }],
      tags: ["Dinner"],
      suggestedSideIds: [side.id],
      suggestedSauceIds: [sauce.id],
    },
  });

  await page.goto("/login");
  await page.getByRole("tab", { name: "Login" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Roast Chicken Plate")).toBeVisible();
  await page.getByText("Roast Chicken Plate").click();

  await expect(page.getByText("Suggested Sides")).toBeVisible();
  await expect(page.getByText("Crisp Salad")).toBeVisible();
  await expect(page.getByText("Suggested Sauces & Condiments")).toBeVisible();
  await expect(page.getByText("Herb Sauce")).toBeVisible();
});
