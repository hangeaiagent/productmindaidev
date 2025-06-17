const fetch = require("node-fetch");

// 直接测试DeepSeek API
async function testDeepSeek() {
  const apiKey = "sk-567abb67b99d4a65acaa2d9ed06c3782";
  
  console.log("=== 测试DeepSeek API ===");
  
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一个专业的产品经理。" },
          { role: "user", content: "为一个名为《AI聊天助手》的项目生成一个项目需求文档的概述，不超过100字。" }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    console.log("响应状态:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误:", errorText);
      return;
    }

    const data = await response.json();
    console.log("API响应成功:");
    console.log("生成内容:", data.choices[0]?.message?.content || "无内容");
    console.log("Token使用:", data.usage);
    
  } catch (error) {
    console.error("API调用异常:", error.message);
  }
}

testDeepSeek(); 