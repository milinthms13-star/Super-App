/**
 * Sample Stories for Cartoon Video Generator Testing
 * These stories demonstrate proper formatting for character extraction,
 * dialogue parsing, and scene generation
 */

const sampleStories = {
  simpleBedtime: {
    title: "The Sleepy Moon",
    text: `Once upon a time, there was a gentle moon named Luna who watched over the world every night.

Luna: "I love seeing children sleep peacefully."

One night, Luna met a tiny star named Sparkle who was afraid of the dark.

Sparkle: "Luna, I'm scared! The night is so dark and quiet."

Luna smiled warmly and said to Sparkle.

Luna: "Don't be afraid, little one. The darkness is peaceful, and we light it up together!"

Sparkle blinked bravely.

Sparkle: "You're right! Together we make the night beautiful!"

And from that night on, Luna and Sparkle shone together, making the night sky magical for all the sleeping children below.`,
    language: "en",
    style: "storybook",
    mode: "bedtime"
  },

  educationalScience: {
    title: "Mia's Water Cycle Adventure",
    text: `Mia was a curious water droplet living in the ocean.

Mia: "I wonder what's beyond the ocean waves?"

The warm sun smiled down at Mia.

Sun: "Come with me, Mia! I'll show you the amazing water cycle!"

The sun's warmth turned Mia into vapor, and she rose into the sky.

Mia: "Wow! I'm flying! This is evaporation!"

High in the clouds, Mia met other water droplets.

Cloud: "Welcome to condensation, Mia! We form clouds together."

When the cloud grew heavy, Mia fell as rain.

Mia: "Wheee! This is precipitation! I'm going back to earth!"

She landed in a river and flowed back to the ocean.

Mia: "What an amazing journey! The water cycle never ends!"`,
    language: "en",
    style: "cartoon",
    mode: "educational"
  },

  moralFriendship: {
    title: "The Rabbit and the Tortoise Learn Together",
    text: `In a peaceful forest, there lived a quick rabbit named Ruby and a slow tortoise named Tom.

Ruby: "I'm so fast! I can run circles around everyone!"

Tom moved slowly but steadily along the path.

Tom: "Speed isn't everything, Ruby. Patience and persistence matter too."

One day, they decided to have a race to the big oak tree.

Ruby: "This will be easy! I'll win for sure!"

Ruby ran very fast but soon got tired and stopped to rest. Meanwhile, Tom kept walking slowly but never stopped.

Tom: "Slow and steady, one step at a time."

When Ruby woke up, she saw Tom crossing the finish line!

Ruby: "Oh no! I was too confident. I should have kept going."

Tom smiled kindly at Ruby.

Tom: "We both have strengths, Ruby. Your speed and my persistence. Together, we'd be unstoppable!"

Ruby learned that day that every friend has special talents, and working together is better than competing.

Ruby: "You're right, Tom! Let's be a team from now on!"`,
    language: "en",
    style: "cartoon",
    mode: "moral"
  },

  funnyAdventure: {
    title: "The Dancing Dinosaur",
    text: `In a colorful jungle, there lived a dinosaur named Dino who loved to dance.

Dino: "Dancing makes me happy! Let me show you my moves!"

Dino started dancing, but his big feet made everything shake!

Monkey: "Whoa! Dino, you're making the trees wiggle!"

A parrot flew down laughing.

Parrot: "Your dancing is making the whole jungle bounce!"

Dino felt a bit sad.

Dino: "Oh no! I just wanted to have fun. Maybe I shouldn't dance."

Elephant walked over with a wise smile.

Elephant: "Don't stop dancing, Dino! Your joy is contagious!"

All the animals started dancing together, and the whole jungle became one big dance party!

Monkey: "This is the best day ever!"

Dino learned that being yourself and sharing your happiness can bring everyone together.

Dino: "Let's dance every day, friends!"`,
    language: "en",
    style: "cartoon",
    mode: "funny"
  },

  mythologyShort: {
    title: "The Little Sun God",
    text: `Long ago, there was a young sun god named Surya who was learning to bring light to the world.

Surya: "I want to shine as bright as the great sun!"

His teacher, the wise Sky Guardian, floated beside him.

Guardian: "Patience, young Surya. True brightness comes from a kind heart."

One day, Surya saw a dark cave where scared children huddled.

Child: "We're afraid of the darkness!"

Surya glowed gently, not too bright to hurt their eyes.

Surya: "Don't worry! I'll be your light and protect you."

The Guardian smiled proudly.

Guardian: "You have learned well, Surya. The greatest light brings warmth and comfort, not just brightness."

From that day, Surya became the sun that warms all beings with kindness.`,
    language: "en",
    style: "anime",
    mode: "mythology"
  },

  multilingualHindi: {
    title: "छोटी चिड़िया की उड़ान (The Little Bird's Flight)",
    text: `एक बार की बात है, एक छोटी चिड़िया रानी थी जो उड़ना सीख रही थी।

Rani: "मैं ऊँचा उड़ना चाहती हूँ!"

उसकी माँ ने प्यार से कहा।

Mother: "धीरे-धीरे प्रयास करो, बेटी। तुम ज़रूर उड़ोगी।"

रानी ने अपने पंख फड़फड़ाए और थोड़ा सा उड़ी।

Rani: "देखो माँ! मैं उड़ रही हूँ!"

एक बुद्धिमान कबूतर ने उसे देखा।

Pigeon: "बहुत अच्छे! अभ्यास से तुम और ऊँचा उड़ोगी।"

दिन-ब-दिन रानी अभ्यास करती रही और अंततः वह आसमान में ऊँचे उड़ सकी।

Rani: "मैंने कर दिखाया! धैर्य और अभ्यास सब कुछ संभव बना देता है!"`,
    language: "hi",
    style: "storybook",
    mode: "moral"
  }
};

/**
 * Get a sample story by category
 * @param {string} category - Story category (bedtime, educational, moral, funny, mythology)
 * @returns {object} Sample story object
 */
const getSampleStory = (category = 'simple') => {
  const stories = {
    simple: sampleStories.simpleBedtime,
    bedtime: sampleStories.simpleBedtime,
    educational: sampleStories.educationalScience,
    science: sampleStories.educationalScience,
    moral: sampleStories.moralFriendship,
    friendship: sampleStories.moralFriendship,
    funny: sampleStories.funnyAdventure,
    adventure: sampleStories.funnyAdventure,
    mythology: sampleStories.mythologyShort,
    hindi: sampleStories.multilingualHindi,
  };

  return stories[category.toLowerCase()] || sampleStories.simpleBedtime;
};

/**
 * Get all sample stories
 * @returns {object} All sample stories
 */
const getAllSampleStories = () => {
  return sampleStories;
};

/**
 * Generate a test story with specified parameters
 * @param {object} options - Story options
 * @returns {object} Generated test story
 */
const generateTestStory = (options = {}) => {
  const {
    characterCount = 2,
    sceneCount = 5,
    language = 'en',
    style = 'cartoon',
    mode = 'bedtime'
  } = options;

  const characters = [
    { name: 'Hero', role: 'protagonist', type: 'hero' },
    { name: 'Friend', role: 'companion', type: 'friend' },
    { name: 'Wise', role: 'mentor', type: 'wise' },
    { name: 'Animal', role: 'helper', type: 'animal' }
  ].slice(0, characterCount);

  const sceneTemplates = [
    'Once upon a time in a magical place',
    'One day something interesting happened',
    'Our hero faced a challenge',
    'With help from friends, they found a solution',
    'Everyone learned an important lesson',
    'And they all lived happily ever after'
  ].slice(0, sceneCount);

  let storyText = `Test Story for ${mode} mode with ${characterCount} characters.\n\n`;

  sceneTemplates.forEach((template, index) => {
    const character = characters[index % characters.length];
    storyText += `${template}.\n\n`;
    storyText += `${character.name}: "This is test dialogue number ${index + 1}!"\n\n`;
  });

  return {
    title: `Test Story - ${mode}`,
    text: storyText,
    language,
    style,
    mode
  };
};

module.exports = {
  sampleStories,
  getSampleStory,
  getAllSampleStories,
  generateTestStory
};
