import { getResponsiveValues } from "@/hooks/useResponsiveLayout";
describe("responsive layout", () => {
  it.each([
    [390, 844, "compact", 2],
    [700, 1024, "medium", 3],
    [1200, 800, "expanded", 4],
  ] as const)("classifies %ipx", (width, height, deviceClass, columns) => {
    expect(getResponsiveValues(width, height, 1)).toMatchObject({
      deviceClass,
      columns,
      isLandscape: width > height,
    });
  });
  it("accounts for insets, large text, and reduced motion", () => {
    expect(getResponsiveValues(390, 844, 1.4, 60, true)).toMatchObject({
      availableHeight: 784,
      isLargeText: true,
      reduceMotion: true,
    });
  });
});
