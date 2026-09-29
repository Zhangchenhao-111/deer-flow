export interface ArtifactDraftState {
  filepath: string;
  baselineContent: string;
  baselineSha256: string | null;
  baselineTruncated: boolean;
  draftContent: string;
  conflict: boolean;
}

export function createArtifactDraft(filepath: string): ArtifactDraftState {
  return {
    filepath,
    baselineContent: "",
    baselineSha256: null,
    baselineTruncated: false,
    draftContent: "",
    conflict: false,
  };
}

export function reconcileArtifactDraft(
  current: ArtifactDraftState,
  loaded: { content: string; sha256: string; truncated?: boolean },
): ArtifactDraftState {
  if (loaded.sha256 === current.baselineSha256) {
    if (
      current.baselineTruncated &&
      !loaded.truncated &&
      current.draftContent === current.baselineContent
    ) {
      return {
        ...current,
        baselineContent: loaded.content,
        baselineTruncated: false,
        draftContent: loaded.content,
      };
    }
    return current;
  }
  if (current.draftContent !== current.baselineContent) {
    return { ...current, conflict: true };
  }
  return {
    ...current,
    baselineContent: loaded.content,
    baselineSha256: loaded.sha256,
    baselineTruncated: loaded.truncated ?? false,
    draftContent: loaded.content,
    conflict: false,
  };
}

export function canEditOpenedArtifact({
  filepath,
  isCodeFile,
  isWriteFile,
  isSkillFile,
  isMock,
  hasRevision,
  isStaticWebsite,
}: {
  filepath: string;
  isCodeFile: boolean;
  isWriteFile: boolean;
  isSkillFile: boolean;
  isMock: boolean;
  hasRevision: boolean;
  isStaticWebsite: boolean;
}): boolean {
  const isOutputArtifact = filepath
    .replace(/^\/+/, "")
    .startsWith("mnt/user-data/outputs/");
  return (
    isCodeFile &&
    !isWriteFile &&
    !isSkillFile &&
    !isMock &&
    hasRevision &&
    !isStaticWebsite &&
    isOutputArtifact
  );
}
