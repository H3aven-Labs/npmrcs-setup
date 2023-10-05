import { hello } from "@/sample";

describe("Sample", () => {
  it("should return correct text", () => {
    const name = 'Test';

    expect(hello(name)).toBe(`Hello ${name}`);
  });
});
