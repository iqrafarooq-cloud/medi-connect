export type RemedySeverity = "self_care" | "watch" | "severe";

export type RemedyResultNav = {
  label: string;
  after: "health" | "clinic";
};

export type RemedyRouter = {
  canDismiss: () => boolean;
  dismissTo: (href: "/(app)/health") => void;
  replace: (href: "/(app)/health") => void;
  navigate: (href: { pathname: "/(app)/clinic"; params: { focus: "nearby" } }) => void;
};

export function remedyResultNav(severity: RemedySeverity): RemedyResultNav {
  if (severity === "severe") {
    return { label: "Find a clinic", after: "clinic" };
  }
  return { label: "Done", after: "health" };
}

export function finishRemedy(router: RemedyRouter, after: RemedyResultNav["after"]) {
  if (router.canDismiss()) {
    router.dismissTo("/(app)/health");
  } else {
    router.replace("/(app)/health");
  }
  if (after === "clinic") {
    router.navigate({ pathname: "/(app)/clinic", params: { focus: "nearby" } });
  }
}
