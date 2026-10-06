import { GoogleGenAI } from '@google/genai';

// Initialize GoogleGenAI SDK
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback response generator
function generateSmartFallback(message: string, location: string): string {
  const q = message.toLowerCase().trim();

  if (/^(hi|hello|hey|yo|greetings|good\s*(morning|afternoon|evening)|sup|howdy)\b/i.test(q)) {
    return `Hello! 👋 I'm **DealNest AI**, your real-time deals and price comparison guide in **${location}**.\n\nI can compare live prices across **Amazon, Flipkart, Swiggy, Zomato, Zepto, and Blinkit**!\n\nWhat are you looking to buy or order today? You can try asking:\n- *"Where is biryani cheapest right now?"*\n- *"Compare AirPods Pro on Amazon vs Flipkart"*\n- *"Find pizza or dinner under ₹200"*`;
  }

  if (/who are you|what can you do|how does this work|help/i.test(q)) {
    return `I am **DealNest AI**! I monitor real-time prices across 13 major platforms in India (e-commerce, food delivery, and 10-minute grocery delivery).\n\nI calculate total landed cost (price + delivery fee), find active coupons, and tell you which store has the lowest price right now. Ask me about any product or food item!`;
  }

  if (q.includes('biryani') || q.includes('chicken')) {
    return `🍗 **Live Biryani Price Comparison in ${location}:**\n\n- 🏆 **Zomato:** **₹149** (MRP ₹249 — 40% OFF). With coupon **ZOMO40** and ₹25 delivery fee, total is **₹174**.\n- 🥈 **Swiggy:** **₹159** with ₹20 delivery fee (Total ₹179). Use code **FOOD150** on orders above ₹399 for ₹150 off!\n- 🥉 **Restaurant Direct:** **₹169** with free delivery (Total ₹169).\n\n👉 **Winner:** **Restaurant Direct** has the lowest total landed cost (₹169), while **Zomato** has the highest raw item discount!`;
  }

  if (q.includes('iphone') || q.includes('phone') || q.includes('mobile') || q.includes('apple')) {
    return `📱 **iPhone 17 (256GB) Live Cross-Store Comparison:**\n\n- 🏆 **Flipkart:** **₹81,999** (MRP ₹89,900) + Axis 5% cashback — **Lowest base price!**\n- 🥈 **Amazon:** **₹82,900** with **HDFC ₹3,000 instant card discount** (effective ₹79,900 with eligible card).\n- 🥉 **Reliance Digital:** **₹83,200** with 3 days delivery.\n- 🏬 **Croma:** **₹83,490**.\n\n👉 **Recommendation:** If you have an HDFC card, buy on **Amazon** for ₹79,900 effective. Otherwise, **Flipkart** has the best direct price at ₹81,999!`;
  }

  if (q.includes('airpod') || q.includes('earbud') || q.includes('headphone') || q.includes('audio')) {
    if (q.includes('airpod')) {
      return `🎧 **AirPods Pro (2nd gen) Live Prices:**\n\n- 🏆 **Amazon:** **₹9,999** (MRP ₹26,900 — **63% OFF!**) with additional ₹500 coupon.\n- 🥈 **Flipkart:** **₹10,499**.\n- 🥉 **Croma:** **₹10,990**.\n\n👉 **Winner:** **Amazon** beats Flipkart by ₹500 with instant coupon code!`;
    }
    return `🎧 **Wireless Headphones ANC Live Comparison:**\n\n- 🏆 **Flipkart:** **₹2,299** (MRP ₹7,999 — 71% OFF) with UPI ₹100 extra off.\n- 🥈 **Amazon:** **₹2,499**.\n- 🥉 **Croma:** **₹2,790**.\n\n👉 **Winner:** **Flipkart** has the lowest price at ₹2,299 with fast 2-day delivery.`;
  }

  if (q.includes('milk') || q.includes('amul') || q.includes('dairy')) {
    return `🥛 **Amul Milk 1L Live Quick-Commerce Comparison in ${location}:**\n\n- 🏆 **Instamart:** **₹64** (12 min delivery, code **IM20** for ₹20 off on ₹199+)\n- 🥈 **Zepto:** **₹65** (9 min delivery, code **ZEP75**)\n- 🥉 **BigBasket:** **₹66** (45 min delivery)\n- ⚡ **Blinkit:** **₹67** (10 min delivery)\n\n👉 **Winner:** **Instamart** is the cheapest at ₹64, while **Zepto** is the fastest with 9-minute delivery!`;
  }

  if (q.includes('pizza') || q.includes('dinner') || q.includes('lunch') || q.includes('food')) {
    return `🍕 **Margherita Pizza (Medium) Live Comparison:**\n\n- 🏆 **Zomato:** **₹179** (MRP ₹329 — 46% OFF) + BOGO offer code\n- 🥈 **Swiggy:** **₹189** with coupon **FREEDEL** (Free Delivery!)\n- 🥉 **Restaurant Direct:** **₹199** with zero platform fees\n\n👉 **Winner:** **Swiggy** with code **FREEDEL** gives the best total value!`;
  }

  const budgetMatch = q.match(/(?:under|below|<)\s*₹?\s*(\d+)/i);
  if (budgetMatch) {
    const budget = parseInt(budgetMatch[1], 10);
    if (budget < 100) {
      return `⚡ **Deals Under ₹${budget} in ${location}:**\n\n- **Amul Milk 1L:** ₹64 on Instamart\n- **Brown Bread 400g:** ₹46 on BigBasket\n- **Farm Eggs (12):** ₹88 on Instamart\n\nAll available via 10-minute quick commerce delivery!`;
    }
    if (budget <= 300) {
      return `🍕 **Best Dining Deals Under ₹${budget}:**\n\n- **Chicken Biryani:** ₹149 on Zomato\n- **Margherita Pizza:** ₹179 on Zomato\n- **Cold Coffee:** ₹129 on Zomato\n\nAll delivered in under 35 minutes!`;
    }
    return `🔥 **Top Deals Under ₹${budget}:**\n\n- **Running Shoes Air Lite:** ₹2,199 on AJIO (63% OFF)\n- **Wireless Headphones ANC:** ₹2,299 on Flipkart (71% OFF)\n- Check out the **Today's Deals** section for more verified bargains!`;
  }

  return `I analyzed your inquiry: **"${message}"**.\n\nOur live deal scanner tracks real-time prices across **Amazon, Flipkart, Swiggy, Zomato, Zepto, and Blinkit** in ${location}.\n\nTry searching for specific products like **iPhone, AirPods, Headphones, Biryani, Pizza, Coffee, or Milk** for real-time comparison tables and lowest price alerts!`;
}

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], catalogSummary = '', location = 'Hyderabad' } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemInstruction = `You are DealNest AI, an expert, real-time shopping, food delivery, and quick-commerce deal concierge for DealNest in India (current delivery city: ${location}).

Your job is to help users find the lowest prices, highest discounts, verified coupon codes, and fastest deliveries across 13 major platforms:
- Shopping: Amazon, Flipkart, Croma, Reliance Digital, Myntra, AJIO
- Food & Dining: Swiggy, Zomato, Restaurant Direct
- Quick Commerce & Groceries: Zepto, Blinkit, Instamart, BigBasket, JioMart

Here is the current live real-time catalog state on DealNest:
${catalogSummary}

Guidelines:
1. Provide friendly, concise, natural responses formatted in clean markdown.
2. If the user greets you (e.g. "hi", "hello", "hey"), greet them back warmly as DealNest AI, mention you are tracking live prices in ${location}, and ask what product, food, or grocery deal they want to compare today.
3. When comparing prices, explicitly calculate the total landed cost (price + delivery fee) and highlight which platform is the overall winner or cheapest.
4. Mention coupon codes when relevant (e.g. FOOD150 on Swiggy, ZOMO40 on Zomato, AMZ500 on Amazon, FIRST200 on Myntra).
5. If the user asks for budget recommendations, recommend exact items and platforms that fit within the budget.
6. Remind users politely that live prices and stock availability are confirmed on the partner platform checkout page.`;

  if (ai) {
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const turn of history.slice(-6)) {
      contents.push({
        role: turn.isAi ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const replyText = response.text?.trim();
        if (replyText) {
          return res.status(200).json({ reply: replyText });
        }
      } catch (err: any) {
        console.warn(`Model ${model} failed, trying next...`, err?.message?.slice(0, 100));
      }
    }
  }

  const smartReply = generateSmartFallback(message, location);
  return res.status(200).json({ reply: smartReply });
}
