import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NewAcademyPanelAction } from "../page";

describe("NewAcademyPanelAction", () => {
  it("links the academies panel create button to the New Academy dialog", () => {
    const markup = renderToStaticMarkup(<NewAcademyPanelAction />);

    assert.match(markup, /New Academy/);
    assert.match(markup, /href="\/admin\?panel=academies&amp;dialog=new-academy"/);
  });
});
