import { describe, expect, it } from "@rstest/core";

import {
  canEditOpenedArtifact,
  createArtifactDraft,
  reconcileArtifactDraft,
} from "@/core/artifacts/editing";

describe("artifact draft reconciliation", () => {
  it("adopts refreshed content while the draft is clean", () => {
    const draft = createArtifactDraft("/mnt/user-data/outputs/report.md");
    const loaded = reconcileArtifactDraft(draft, {
      content: "first",
      sha256: "a".repeat(64),
    });
    const refreshed = reconcileArtifactDraft(loaded, {
      content: "second",
      sha256: "b".repeat(64),
    });

    expect(refreshed.baselineContent).toBe("second");
    expect(refreshed.draftContent).toBe("second");
    expect(refreshed.conflict).toBe(false);
  });

  it("preserves a dirty draft and marks a conflict after a remote change", () => {
    const loaded = reconcileArtifactDraft(
      createArtifactDraft("/mnt/user-data/outputs/report.md"),
      { content: "first", sha256: "a".repeat(64) },
    );
    const edited = { ...loaded, draftContent: "my changes" };
    const refreshed = reconcileArtifactDraft(edited, {
      content: "agent changes",
      sha256: "b".repeat(64),
    });

    expect(refreshed.draftContent).toBe("my changes");
    expect(refreshed.baselineContent).toBe("first");
    expect(refreshed.conflict).toBe(true);
  });

  it("promotes a clean truncated baseline when the full content has the same revision", () => {
    const content = "a".repeat(10);
    const fullContent = `${content}tail`;
    const loaded = reconcileArtifactDraft(
      createArtifactDraft("/mnt/user-data/outputs/large.txt"),
      { content, sha256: "a".repeat(64), truncated: true },
    );
    const full = reconcileArtifactDraft(loaded, {
      content: fullContent,
      sha256: "a".repeat(64),
      truncated: false,
    });

    expect(full.baselineContent).toBe(fullContent);
    expect(full.draftContent).toBe(fullContent);
    expect(full.baselineTruncated).toBe(false);
    expect(full.conflict).toBe(false);
  });

  it("keeps a dirty truncated draft when the full content has the same revision", () => {
    const loaded = reconcileArtifactDraft(
      createArtifactDraft("/mnt/user-data/outputs/large.txt"),
      { content: "preview", sha256: "a".repeat(64), truncated: true },
    );
    const edited = { ...loaded, draftContent: "my changes" };
    const full = reconcileArtifactDraft(edited, {
      content: "preview plus the rest",
      sha256: "a".repeat(64),
      truncated: false,
    });

    expect(full.draftContent).toBe("my changes");
    expect(full.baselineContent).toBe("preview");
    expect(full.baselineTruncated).toBe(true);
    expect(full.conflict).toBe(false);
  });
});

describe("opened artifact edit eligibility", () => {
  const editable = {
    filepath: "/mnt/user-data/outputs/report.md",
    isCodeFile: true,
    isWriteFile: false,
    isSkillFile: false,
    isMock: false,
    hasRevision: true,
    isStaticWebsite: false,
  };

  it("allows an opened formal output rendered by the code editor", () => {
    expect(canEditOpenedArtifact(editable)).toBe(true);
  });

  it("does not expose editing for paths outside formal output artifacts", () => {
    expect(
      canEditOpenedArtifact({
        ...editable,
        filepath: "/mnt/user-data/workspace/report.md",
      }),
    ).toBe(false);
  });

  it("does not expose editing for temporary or non-editor previews", () => {
    expect(canEditOpenedArtifact({ ...editable, isWriteFile: true })).toBe(
      false,
    );
    expect(canEditOpenedArtifact({ ...editable, isCodeFile: false })).toBe(
      false,
    );
  });
});
