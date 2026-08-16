import { HearLogo } from "@/components/brand/HearLogo";

describe("HearLogo", () => {
  it("creates HearLogo element with correct default props and accessibility", () => {
    const element = HearLogo({ size: 48 });
    expect(element.props.accessibilityRole).toBe("image");
    expect(element.props.accessibilityLabel).toBe("Hear! Logo");
    expect(element.props.style).toEqual(
      expect.arrayContaining([{ width: 48, height: 48 }]),
    );
  });

  it("supports custom width and height", () => {
    const element = HearLogo({ width: 120, height: 60 });
    expect(element.props.style).toEqual(
      expect.arrayContaining([{ width: 120, height: 60 }]),
    );
  });
});
