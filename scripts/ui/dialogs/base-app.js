const { ApplicationV2 } = foundry.applications.api;

/**
 * ApplicationV2 base class for dialogs whose render method returns HTML text.
 */
export class HtmlApplicationV2 extends ApplicationV2 {
  _replaceHTML(result, content) {
    if (typeof result !== "string") {
      content.replaceChildren(result);
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = result.trim();
    content.replaceChildren(...template.content.childNodes);
  }
}
