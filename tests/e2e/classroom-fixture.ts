import type { Page } from "@playwright/test";

/** Seed the documented local classroom format; no production-only test route or cloud mock. */
export async function seedClassroom(
  page: Page,
  completed = 0,
  names: string[] = [],
) {
  await page.addInitScript(
    ({ completed, names }) => {
      // Reloads must test real persistence rather than reseeding/resetting the classroom.
      if (sessionStorage.getItem("voies.fixture.initialized")) return;
      localStorage.setItem(
        "voies.classroom-progress.v1",
        JSON.stringify({
          version: 1,
          completed,
          pendingCelebration:
            completed === 16 ? 1 : completed === 32 ? 2 : null,
        }),
      );
      localStorage.setItem(
        "voies.classroom-names.v1",
        JSON.stringify({
          version: 1,
          names,
          spoken: [],
          lastSpeaker: null,
          noRepeat: true,
        }),
      );
      sessionStorage.setItem("voies.fixture.initialized", "true");
    },
    { completed, names },
  );
}

/** Complete the interactive thought-ordering step before continuing the presentation. */
export async function arrangeClassroomIdeas(page: Page) {
  const ideas = page.getByRole('region', { name: 'ترتيب أفكار مريم' });
  for (const name of ['التحية واسمي', 'عمري ومدرستي وصفّي', 'ما أحبّه وهوايتي', 'أختم بلطف']) {
    await ideas.getByRole('button', { name }).click();
  }
}
