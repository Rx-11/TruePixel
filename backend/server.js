require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const artifact = require("./abi.json");
const { OpenRouter } = require("@openrouter/sdk");
const ABI = artifact.abi || artifact;
const fs = require("fs")

const multer = require("multer");

// 2. Configure Multer to store files in memory (so we can hash the buffer)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB
});

const app = express();
app.use(cors());
app.use(express.json());

// 1. Setup Blockchain
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

// 2. Setup Gemini AI
const genAI = new GoogleGenAI(process.env.GOOGLE_API_KEY);

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY // Ensure your ENV variable is set
});
/**
 * Uses Gemini to generate an SVG image based on the prompt.
 * We use SVG because Gemini Pro/Flash outputs text, and SVG is text-based code 
 * that browsers render as an image.
 */
async function generateGeminiImage(prompt) {
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
      console.log("Image saved as gemini-native-image.png");
      return buffer
    }
  }


  
  // Return as Buffer
  return Buffer.from(text);
}

async function generateOpenRouterImage(prompt) {
  // Use the specific model from your example
  const model = 'google/gemini-2.5-flash-image';
//   const model = 'sourceful/riverflow-v2-max-preview';
  console.log(`🤖 Asking ${model} to generate image via native Fetch...`);

  try {
    // 1. Native Fetch Call
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            // Pre-pending instruction helps ensure image output
            content: `Generate an image of: ${prompt}`,
          },
        ],
        // CRITICAL: specific to OpenRouter/Gemini to signal image generation
        modalities: ['image', 'text'],
      }),
    });

    // 2. Handle HTTP Errors
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
    }

    // 3. Parse JSON
    const result = await response.json();
    
    // Debug log to see raw structure if needed
    // console.log(JSON.stringify(result, null, 2));

    if (result.choices && result.choices.length > 0) {
      const message = result.choices[0].message;
      console.log("Message Content:", message.content?.substring(0, 50) + "...");

      // ---------------------------------------------------------
      // STRATEGY 1: OpenRouter Standard 'images' Array
      // ---------------------------------------------------------
      // The example API usage suggests checking message.images[].image_url.url
      if (message.images && message.images.length > 0) {
        console.log("✅ Image found in standard 'images' array.");
        
        const imageObj = message.images[0];
        
        // Handle variations: 
        // 1. Raw fetch often returns snake_case: image_url.url
        // 2. SDKs often normalize to camelCase: imageUrl.url
        // 3. Simple direct URL strings
        const imageUri = 
          imageObj.image_url?.url || // Standard OpenAI/OpenRouter format
          imageObj.imageUrl?.url ||  // SDK normalized format
          imageObj.url ||            // Simplify fallback
          imageObj;                  // Direct string fallback

        return await processImageUri(imageUri);
      }

      // ---------------------------------------------------------
      // STRATEGY 2: Fallback - Markdown Link in Text Content
      // ---------------------------------------------------------
      // Gemini often puts the image in the text: "Here is the image: ![Alt](data:image...)"
      if (message.content) {
        console.log("Checking text content for embedded image links...");
        
        // Regex to find ![...](url_or_base64)
        const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
        const match = message.content.match(markdownImageRegex);

        if (match && match[1]) {
          const imageUri = match[1];
          console.log("✅ Image found embedded in text content.");
          return await processImageUri(imageUri);
        }

        console.log("❌ Model returned text only:", message.content);
      }
    }

    throw new Error("No image data found in response (checked images array and markdown)");

  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
}

// Keep your existing helper function
async function processImageUri(uri) {
  let buffer;

  if (uri.startsWith('data:')) {
    // Handle Base64 Data URI
    // e.g. "data:image/png;base64,iVBORw0KGgo..."
    const base64Data = uri.replace(/^data:image\/\w+;base64,/, "");
    buffer = Buffer.from(base64Data, "base64");
  } else {
    // Handle Remote URL (http/https)
    console.log("Fetching image from remote URL...");
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  // Ensure fs is imported at the top of your file: const fs = require('fs');
  fs.writeFileSync("openrouter-image.png", buffer);
  console.log("Image saved as openrouter-image.png");
  
  return buffer;
}



// 3. API Endpoint
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  console.log(`\n🎨 Received Prompt: "${prompt}"`);

  try {
    // A. Generate "Image" (SVG) via Gemini
    console.log("   🤖 Asking Gemini to generate SVG...");
    const imageBuffer = await generateOpenRouterImage(prompt);
    // const imageBuffer = await generateGeminiImage(prompt);
    
    // Convert buffer to string to check if it's valid SVG (optional logging)
    const imageString = imageBuffer.toString();
    console.log(`   ✨ Generated ${imageString.length} bytes of SVG data.`);

    // B. Calculate Commitment (Hash)
    const imageCommitment = ethers.keccak256(imageBuffer);
    console.log(`   #️⃣ Image Hash: ${imageCommitment}`);

    // C. Submit to Blockchain
    console.log("   ⛓️ Submitting attestation to chain...");
    
    const tx = await contract.registerAttestation(
      imageCommitment,
      process.env.MODEL_ID || "gemini-2.5-flash"
    );
    
    console.log(`   ⏳ Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ Attestation Confirmed!");

    // D. Return Response (Base64 encoded SVG)
    res.json({
      success: true,
      data: {
        prompt: prompt,
        // The frontend can display this using <img src="data:image/svg+xml;base64,...">
        image_base64: imageBuffer.toString("base64"), 
        image_type: "image/svg+xml",
        image_hash: imageCommitment,
        tx_hash: tx.hash,
        attestation_url: `https://etherscan.io/tx/${tx.hash}`,
        model_id: process.env.MODEL_ID
      }
    });

  } catch (error) {
    console.error("❌ Error:", error);

    let errorMessage = "Internal Server Error";
    if (error.message.includes("AttestationAlreadyExists")) {
        errorMessage = "Image already exists on chain.";
    } else if (error.message.includes("NotRegisteredProvider")) {
        errorMessage = "Provider wallet not registered.";
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.message 
    });
  }
});

app.post("/verify", upload.single("image"), async (req, res) => {
  try {
    // A. Validate File
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided." });
    }

    console.log(`\n🔍 Verifying image: ${req.file.originalname} (${req.file.size} bytes)`);

    // B. Re-calculate the Hash
    // We must use the exact same hashing algorithm used during generation (Keccak256)
    const imageBuffer = req.file.buffer;
    const imageHash = ethers.keccak256(imageBuffer);
    
    console.log(`   #️⃣ Calculated Hash: ${imageHash}`);

    // C. Query the Smart Contract
    // Assuming your contract has a mapping: mapping(bytes32 => Attestation) public attestations;
    // Or a function: getAttestation(bytes32 hash)
    console.log("   ⛓️ Querying blockchain...");
    
    // Note: Adjust 'attestations' to match your specific contract function/mapping name
    const attestation = await contract.attestations(imageHash);

    // D. Check Results
    // In Solidity, empty records return 0x000... address and empty strings
    // We check if the provider address is NOT the zero address
    const providerAddress = attestation[0]; // Assuming struct order: (provider, modelId, ...)
    // OR if accessing by name in Ethers v6: attestation.provider or attestation.prover

    // Helper to check for zero address
    const isRegistered = providerAddress !== "0x0000000000000000000000000000000000000000";

    if (isRegistered) {
      console.log("   ✅ Verified on-chain!");
      
      // Extract data (Adjust indices based on your struct definition)
      // Example Struct: struct Attestation { address provider; string modelId; uint256 timestamp; }
      const verifiedData = {
        is_verified: true,
        image_hash: imageHash,
        provider: attestation[0], // or attestation.provider
        model_id: attestation[1], // or attestation.modelId
        // Timestamp comes as a BigInt in Ethers v6, convert to Number
        timestamp: attestation[2] ? Number(attestation[2]) : null 
      };

      return res.json({
        success: true,
        data: verifiedData
      });
    } else {
      console.log("   ❌ Hash not found on chain.");
      return res.json({
        success: false,
        error: "This image has not been attested on the blockchain.",
        debug_hash: imageHash
      });
    }

  } catch (error) {
    console.error("❌ Verification Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Verification failed due to server error.",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Gemini Backend running on http://localhost:${PORT}`);
});