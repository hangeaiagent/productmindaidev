#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8888/.netlify/functions/aibase-crawler-batch';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRemainingCrawl() {
  console.log('🚀 开始处理剩余AIbase产品...');
  
  try {
    // 步骤1: 获取所有产品链接
    console.log('📋 步骤1: 获取所有产品链接...');
    
    const urlsResponse = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'urls'
      })
    });

    if (!urlsResponse.ok) {
      throw new Error(`获取链接失败: ${urlsResponse.status}`);
    }

    const urlsData = await urlsResponse.json();
    
    if (!urlsData.success) {
      throw new Error('获取链接失败');
    }

    const urls = urlsData.urls;
    const totalUrls = urls.length;
    const batchSize = 15; // 减小批次大小
    const totalBatches = Math.ceil(totalUrls / batchSize);

    console.log(`✅ 获取到 ${totalUrls} 个产品链接`);
    console.log(`📊 将分 ${totalBatches} 批处理，每批 ${batchSize} 个产品`);

    // 步骤2: 从第60个产品开始处理（跳过已处理的）
    let currentBatch = Math.floor(60 / batchSize) + 1;
    let startIndex = 60; // 从第61个产品开始
    let totalSaved = 0;
    let totalErrors = 0;

    while (startIndex < totalUrls) {
      console.log(`\n🔄 处理第 ${currentBatch}/${totalBatches} 批 (${startIndex + 1}-${Math.min(startIndex + batchSize, totalUrls)}/${totalUrls})`);
      
      try {
        const batchResponse = await fetch(BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode: 'process',
            startIndex,
            batchSize,
            urls
          })
        });

        if (!batchResponse.ok) {
          console.error(`❌ 批次 ${currentBatch} 请求失败: ${batchResponse.status}`);
          
          // 如果是500错误，尝试更小的批次
          if (batchResponse.status === 500 && batchSize > 5) {
            console.log('🔄 尝试更小的批次大小...');
            const smallerBatchSize = Math.max(5, Math.floor(batchSize / 2));
            
            const smallBatchResponse = await fetch(BASE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                mode: 'process',
                startIndex,
                batchSize: smallerBatchSize,
                urls
              })
            });

            if (smallBatchResponse.ok) {
              const smallBatchData = await smallBatchResponse.json();
              if (smallBatchData.success) {
                const { batch, progress } = smallBatchData;
                totalSaved += batch.saved;
                totalErrors += batch.errors;

                console.log(`✅ 小批次 ${currentBatch} 完成:`);
                console.log(`   - 处理: ${batch.processed} 个产品`);
                console.log(`   - 保存: ${batch.saved} 个新产品`);
                console.log(`   - 错误: ${batch.errors} 个`);
                console.log(`   - 进度: ${progress.percentage}%`);

                if (smallBatchData.savedProjects && smallBatchData.savedProjects.length > 0) {
                  console.log(`   - 新产品示例: ${smallBatchData.savedProjects.map(p => p.name).join(', ')}`);
                }

                startIndex += smallerBatchSize;
                currentBatch++;
                
                await sleep(3000); // 更长的延迟
                continue;
              }
            }
          }
          
          // 如果还是失败，跳过这个批次
          console.log(`⏭️ 跳过批次 ${currentBatch}，继续下一批...`);
          startIndex += batchSize;
          currentBatch++;
          await sleep(5000);
          continue;
        }

        const batchData = await batchResponse.json();
        
        if (!batchData.success) {
          console.error(`❌ 批次 ${currentBatch} 处理失败:`, batchData.error);
          startIndex += batchSize;
          currentBatch++;
          await sleep(3000);
          continue;
        }

        const { batch, progress } = batchData;
        totalSaved += batch.saved;
        totalErrors += batch.errors;

        console.log(`✅ 批次 ${currentBatch} 完成:`);
        console.log(`   - 处理: ${batch.processed} 个产品`);
        console.log(`   - 保存: ${batch.saved} 个新产品`);
        console.log(`   - 错误: ${batch.errors} 个`);
        console.log(`   - 进度: ${progress.percentage}%`);

        // 显示保存的产品示例
        if (batchData.savedProjects && batchData.savedProjects.length > 0) {
          console.log(`   - 新产品示例: ${batchData.savedProjects.map(p => p.name).join(', ')}`);
        }

        startIndex += batchSize;
        currentBatch++;

        // 批次间延迟，避免过载
        if (startIndex < totalUrls) {
          console.log('⏳ 等待 3 秒后继续下一批...');
          await sleep(3000);
        }

      } catch (error) {
        console.error(`❌ 批次 ${currentBatch} 处理异常:`, error.message);
        
        // 等待更长时间后重试
        console.log('⏳ 等待 5 秒后重试...');
        await sleep(5000);
        startIndex += batchSize;
        currentBatch++;
        continue;
      }
    }

    console.log('\n🎉 剩余AIbase产品采集完成!');
    console.log(`📊 总结:`);
    console.log(`   - 总产品数: ${totalUrls}`);
    console.log(`   - 处理批次: ${currentBatch - Math.floor(60 / batchSize) - 1}`);
    console.log(`   - 成功保存: ${totalSaved} 个新产品`);
    console.log(`   - 总错误数: ${totalErrors}`);

  } catch (error) {
    console.error('❌ 剩余采集失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
runRemainingCrawl().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
}); 