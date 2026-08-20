import { getResponsiveValues } from "@/utils/responsive";
describe("responsive layout", () => {
  it.each([
    [360, 640, "compact", 2, true, false],
    [390, 844, "compact", 2, false, false],
    [700, 1024, "medium", 3, false, true],
    [1200, 800, "expanded", 4, false, true],
  ] as const)(
    "classifies %ipx width correctly",
    (width, height, deviceClass, columns, isCompact, isTablet) => {
      const values = getResponsiveValues(width, height, 1);
      expect(values).toMatchObject({
        deviceClass,
        columns,
        isCompact,
        isTablet,
        isLandscape: width > height,
      });
      expect(values.cardWidth).toBeGreaterThan(0);
      expect(values.cardWidth).toBeLessThanOrEqual(values.width);
    },
  );
  it("accounts for insets, large text, and reduced motion", () => {
    expect(getResponsiveValues(390, 844, 1.4, 60, true)).toMatchObject({
      availableHeight: 784,
      isLargeText: true,
      reduceMotion: true,
    });
  });
});
