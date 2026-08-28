import type { HistoryGroup } from "@/types";

export const defaultHistoryGroups: HistoryGroup[] = [
  {
    label: "TODAY",
    rows: [
      {
        storyId: "daily",
        playedMinutes: 18,
        completed: false,
        playedAt: "8:20 PM",
        meta: "18 min played · Hear! Daily",
      },
      {
        storyId: "london",
        playedMinutes: 6,
        completed: true,
        playedAt: "2:15 PM",
        meta: "Completed · Community Radio",
      },
    ],
  },
  {
    label: "YESTERDAY",
    rows: [
      {
        storyId: "city-lab",
        playedMinutes: 9,
        completed: false,
        playedAt: "Yesterday 9:40 PM",
        meta: "9 min played · CityLab",
      },
    ],
  },
  {
    label: "THIS WEEK",
    rows: [
      {
        storyId: "tech",
        playedMinutes: 21,
        completed: true,
        playedAt: "3 days ago",
        meta: "Completed · Signal & Noise",
      },
      {
        storyId: "arts",
        playedMinutes: 12,
        completed: true,
        playedAt: "4 days ago",
        meta: "Completed · Culture Weekly",
      },
    ],
  },
];
