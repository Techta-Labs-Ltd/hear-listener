import { appAssets } from "@/constants/assets";
import type { ContentItem, Entity, Topic } from "@/types";

const DEMO_DURATION = 30;

const baseStories: ContentItem[] = [
  {
    id: "daily",
    title: "The stories shaping your evening",
    creator: "Hear Daily",
    publication: "Today",
    duration: "18 min left",
    category: "Continue",
    color: "#7B3068",
    description:
      "The evening round-up of the day's biggest local stories, in under twenty minutes.",
    topicIds: ["local", "technology"],
    progress: 0.62,
  },
  {
    id: "lagos",
    title: "What changed in Lagos today",
    creator: "Lagos Community Radio",
    publication: "Local news",
    duration: "6 min",
    category: "New",
    color: "#21798A",
    description:
      "Markets, roads and neighbourhoods: the changes Lagos noticed today.",
    topicIds: ["local"],
  },
  {
    id: "arts",
    title: "Inside the city's new arts space",
    creator: "Culture Weekly",
    publication: "Arts",
    duration: "12 min",
    category: "New",
    color: "#8C4C9B",
    description:
      "A tour of the studios and stages reshaping the city's creative quarter.",
    topicIds: ["culture"],
  },
  {
    id: "local-voices",
    title: "How the city is changing after dark",
    creator: "Street Stories",
    publication: "Today",
    duration: "14 min",
    category: "Featured",
    color: "#21798A",
    description:
      "The people, places and ideas reshaping the city after sunset.",
    topicIds: ["local", "culture"],
  },
  {
    id: "morning-headlines",
    title: "Morning headlines",
    creator: "Hear Daily",
    publication: "News",
    duration: "8 min",
    category: "Downloaded",
    color: "#21798A",
    description: "The essential stories to begin your day informed.",
    topicIds: ["local"],
    downloaded: true,
  },
  {
    id: "city-lab",
    title: "A better way to move around Lagos",
    creator: "City Lab",
    publication: "Ideas",
    duration: "21 min",
    category: "Downloaded",
    color: "#8C4C9B",
    description: "New thinking about safer and more accessible city transport.",
    topicIds: ["local", "business"],
    downloaded: true,
  },
  {
    id: "tech",
    title: "The human side of new technology",
    creator: "Signal & Noise",
    publication: "Technology",
    duration: "21 min",
    category: "Featured",
    color: "#3365A4",
    description:
      "How new tools are changing everyday work, care and conversation.",
    topicIds: ["technology"],
  },
  {
    id: "wellbeing",
    title: "A quieter way to start the day",
    creator: "Still Morning",
    publication: "Wellbeing",
    duration: "9 min",
    category: "Recommended",
    color: "#3F7E5A",
    description: "Short guided listening for a calmer, clearer morning.",
    topicIds: ["wellbeing"],
  },
  {
    id: "business",
    title: "Small shops, big ideas",
    creator: "Market Street",
    publication: "Business",
    duration: "14 min",
    category: "Trending",
    color: "#B26A2E",
    description:
      "Independent traders on the ideas turning neighbourhood streets around.",
    topicIds: ["business"],
  },
  {
    id: "sport",
    title: "The weekend in sport",
    creator: "Hear Sport",
    publication: "Sport",
    duration: "16 min",
    category: "Latest",
    color: "#356C9A",
    description:
      "Results, voices and the stories behind this weekend’s action.",
    topicIds: ["sport"],
  },
  {
    id: "tyndale-edition",
    title: "Tyndale Talking Magazine",
    creator: "Tyndale Talking Magazine",
    publication: "Tyndale Talking Magazine",
    duration: "25 min",
    category: "New",
    color: "#4C3D8F",
    description:
      "The latest audio edition and community news from Tyndale Talking Magazine.",
    topicIds: ["local", "culture"],
  },
];

export const stories: ContentItem[] = baseStories.map((item) => ({
  ...item,
  audioUrl: appAssets.audio.demoStory,
  audioDurationSeconds: DEMO_DURATION,
}));

export const topics: Topic[] = [
  { id: "local", name: "Local news", description: "Stories from around you" },
  { id: "culture", name: "Culture", description: "Arts, books and ideas" },
  { id: "technology", name: "Technology", description: "People and progress" },
  { id: "wellbeing", name: "Wellbeing", description: "Thoughtful listening" },
  { id: "business", name: "Business", description: "Shops, money and work" },
  { id: "sport", name: "Sport", description: "Games, teams and people" },
];

export const entities: Entity[] = [
  {
    id: "hear-daily",
    name: "Hear Daily",
    kind: "publication",
    description: "Local daily briefs",
  },
  {
    id: "tyndale-talking-magazine",
    name: "Tyndale Talking Magazine",
    kind: "publication",
    description: "Community audio magazine",
  },
  {
    id: "lagos-radio",
    name: "Lagos Community Radio",
    kind: "organisation",
    description: "Community station",
  },
  {
    id: "culture-weekly",
    name: "Culture Weekly",
    kind: "publication",
    description: "Arts and ideas",
  },
  {
    id: "signal-noise",
    name: "Signal & Noise",
    kind: "creator",
    description: "Technology stories",
  },
  {
    id: "still-morning",
    name: "Still Morning",
    kind: "creator",
    description: "Wellbeing audio",
  },
  {
    id: "market-street",
    name: "Market Street",
    kind: "publication",
    description: "Business and trade",
  },
];
