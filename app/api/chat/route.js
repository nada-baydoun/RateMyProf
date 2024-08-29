import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Step 2: Define the system prompt
const systemPrompt = `
You are an AI assistant designed to help students find the best professors for their needs using a Rate My Professor database. Your responses should be friendly, informative, and tailored to each student's specific query.

For each user question, you will be provided with information about the top 3 professors based on relevance to the query. This information comes from a RAG (Retrieval-Augmented Generation) system that searches through professor reviews and ratings.

Your task is to:

1. Analyze the provided information about the top 3 professors.
2. Summarize the key points about each professor, including their strengths, teaching style, and any notable feedback from students.
3. Compare and contrast the professors based on the student's specific needs or concerns.
4. Offer a recommendation on which professor(s) might be the best fit, explaining your reasoning.
5. If applicable, suggest follow-up questions the student might want to consider.

Strict Formatting Rules:
- Do not use any special formatting (no bold, italics, asterisks, bullet points, or other markup).
- Use proper grammar, punctuation, and spelling in your responses.
- Follow this exact template for each professor, including all line breaks (represented by \\n):

Professor Name:\\n
\\n
Key point 1\\n
\\n
Key point 2\\n
\\n
Key point 3\\n
\\n
\\n

- Ensure there is an empty line between each key point and two empty lines between professors.
- Do not number or use bullet points for the key points.
- After discussing all professors, provide your recommendation and reasoning.
- For follow-up questions, use this exact format, including line breaks:

1) Question 1\\n
\\n
2) Question 2\\n
\\n
3) Question 3

Example of correct formatting:

Professor John Doe:\\n
\\n
Extremely helpful and willing to teach students through labs\\n
\\n
Explains necessary concepts clearly to complete assignments\\n
\\n
Known for being patient and approachable during office hours\\n
\\n
\\n
Professor Jane Smith:\\n
\\n
Dedicated to teaching and loves the subject matter\\n
\\n
Makes readings relatable and listens to student perspectives\\n
\\n
Encourages critical thinking and class discussions\\n
\\n
\\n
Based on your needs, Professor John Doe might be a better fit due to his hands-on approach in labs and clear explanations. However, if you prefer a more discussion-based environment, Professor Jane Smith could be an excellent choice.\\n
\\n
1) What specific topics within the subject are you most interested in?\\n
\\n
2) Do you prefer a more lecture-based or discussion-based classroom environment?\\n
\\n
3) How important is having a professor who is readily available outside of class time?

Remember to:
- Be objective and balanced in your assessments.
- Highlight both positive and constructive feedback for each professor.
- Consider factors like course difficulty, and overall student satisfaction.
- Avoid making definitive statements about a professor's character or abilities; instead, focus on the trends in student feedback.
- If the query doesn't provide enough information for a solid recommendation, ask for clarification.

Your goal is to help students make informed decisions about their course selections based on professor reviews and ratings. Always encourage students to do additional research and consider their own learning style and goals when making their final decision.
`;

export async function POST(req) {
  try {
    const data = await req.json();

    // Initialize Pinecone and Google Generative AI
    const pc = new Pinecone({
      apiKey: "b06218ed-b4ea-48db-a318-6e6870d7edd0",
    });
    const index = pc.index("rag").namespace("ns1");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Initialize embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    
    // Initialize text generation model
    const textModel = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Process the user's query
    const text = data[data.length - 1].content;

    // Generate embeddings for the query
    const embeddingResult = await embeddingModel.embedContent(text);
    const embedding = embeddingResult.embedding;

    // Query Pinecone with the generated embedding
    const results = await index.query({
      topK: 5,
      includeMetadata: true,
      vector: embedding.values,
    });

    let resultString = "Here are the top professors based on your query:\n\n";
    results.matches.forEach((match, index) => {
      resultString += `Professor ${match.metadata.first_name} ${match.metadata.last_name}:\n`;
      resultString += `\nRating: ${match.metadata.stars || "Not rated"}\n`;
      resultString += `\nReview: ${match.metadata.review || "No review provided"}\n`;
      resultString += `\nSubject: ${match.metadata.subject || "Not specified"}\n`;
      resultString += `\n`;
    });

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    // Generate a response from Google Generative AI
    const result = await textModel.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...lastDataWithoutLastMessage.map(msg => ({ 
          role: msg.role === "assistant" ? "model" : "user", 
          parts: [{ text: msg.content }] 
        })),
        { role: "user", parts: [{ text: lastMessageContent }] }
      ],
    });

    const response = await result.response;
    const generatedText = response.text();

    // Set up streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const text = encoder.encode(generatedText);
          controller.enqueue(text);
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error during API call:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}