#!/usr/bin/env node
/**
 * ProductMind AI 模板补充生成器 (API调用版)
 * 文件: docs/templateSEO/sh/template-completion-generator.cjs
 * 
 * 功能：
 * 1. 分析所有项目是否包含完整的7个模板 (isshow=1的模板)
 * 2. 统计缺失的模板数量和详细清单
 * 3. 调用现有的批量生成API补充缺失的模板
 * 4. 不重新开发生成逻辑，复用现有系统
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// 环境变量配置
require('dotenv').config({ path: 'aws-backend/.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    console.error('请检查 aws-backend/.env 文件中的:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class TemplateCompletionGenerator {
    constructor() {
        this.stats = {
            totalProjects: 0,
            projectsWithCompleteTemplates: 0,
            projectsNeedingTemplates: 0,
            totalMissingTemplates: 0,
            generatedTemplates: 0,
            apiCalls: 0,
            errors: 0,
            startTime: new Date()
        };
        this.activeTemplates = [];
        this.detailedResults = [];
        this.apiConfig = {
            baseUrl: 'http://productmindai.com/.netlify/functions/batch-generate-templates',
            userId: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
            timeout: 30000,
            retryAttempts: 2
        };
    }

    async run() {
        console.log('🔍 ProductMind AI 模板补充生成器 (API调用版)');
        console.log('分析时间:', new Date().toLocaleString('zh-CN'));
        console.log('='.repeat(80));

        try {
            // 1. 获取所有活跃模板
            this.activeTemplates = await this.getActiveTemplates();
            console.log(`\n📋 1. 活跃模板统计: ${this.activeTemplates.length} 个`);
            this.displayActiveTemplates();

            // 2. 获取所有项目
            const projects = await this.getAllProjects();
            console.log(`\n📊 2. 项目统计: ${projects.length} 个`);
            this.stats.totalProjects = projects.length;

            // 3. 分析项目模板完整性
            console.log(`\n🔍 3. 分析项目模板完整性...`);
            this.detailedResults = await this.analyzeProjectTemplates(projects);

            // 4. 显示详细分析结果
            this.displayDetailedAnalysis();

            // 5. 执行补充生成
            if (process.argv.includes('--execute') || process.argv.includes('-e')) {
                await this.executeTemplateGeneration();
            } else {
                console.log('\n💡 提示: 添加 --execute 或 -e 参数来执行实际的模板补充生成');
                console.log('例如: node docs/templateSEO/sh/template-completion-generator.cjs --execute');
            }

            // 6. 生成统计报告
            this.generateFinalReport();

        } catch (error) {
            console.error('❌ 分析过程中出错:', error);
            process.exit(1);
        }
    }

    displayActiveTemplates() {
        console.log('   标准模板清单 (isshow=1):');
        this.activeTemplates.forEach((template, i) => {
            console.log(`   ${String(i + 1).padStart(2, ' ')}. ${template.name_zh.padEnd(20, ' ')} | ${template.name_en || 'N/A'}`);
        });
        console.log(`\n   ✅ 每个项目应该有 ${this.activeTemplates.length} 个模板版本`);
    }

    async getActiveTemplates() {
        const { data: templates, error } = await supabase
            .from('templates')
            .select(`
                id, name_zh, name_en, prompt_content, mdcprompt,
                template_categories!inner (id, name_zh, isshow)
            `)
            .eq('template_categories.isshow', 1)
            .order('name_zh');

        if (error) {
            throw new Error(`获取活跃模板失败: ${error.message}`);
        }

        return templates || [];
    }

    async getAllProjects() {
        const { data: projects, error } = await supabase
            .from('user_projects')
            .select('id, name, name_zh, name_en, description, created_at, primary_category')
            .not('name', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`获取项目失败: ${error.message}`);
        }

        return projects || [];
    }

    async analyzeProjectTemplates(projects) {
        const results = [];
        const progressInterval = Math.max(1, Math.floor(projects.length / 20));
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            
            if (i % progressInterval === 0 || i === projects.length - 1) {
                const percentage = ((i + 1) / projects.length * 100).toFixed(1);
                console.log(`   进度: ${i + 1}/${projects.length} (${percentage}%)`);
            }

            // 获取项目已有的模板版本
            const { data: existingVersions, error } = await supabase
                .from('template_versions')
                .select('id, template_id, created_at')
                .eq('project_id', project.id);

            if (error) {
                console.warn(`⚠️  项目 ${project.name} 查询失败:`, error.message);
                continue;
            }

            const existingTemplateIds = new Set(existingVersions?.map(v => v.template_id) || []);
            const missingTemplates = this.activeTemplates.filter(t => !existingTemplateIds.has(t.id));
            
            const projectResult = {
                project: project,
                existingCount: existingVersions?.length || 0,
                expectedCount: this.activeTemplates.length,
                missingTemplates: missingTemplates,
                missingCount: missingTemplates.length,
                isComplete: missingTemplates.length === 0,
                completionRate: ((existingTemplateIds.size / this.activeTemplates.length) * 100).toFixed(1)
            };

            results.push(projectResult);

            // 更新统计
            if (projectResult.isComplete) {
                this.stats.projectsWithCompleteTemplates++;
            } else {
                this.stats.projectsNeedingTemplates++;
                this.stats.totalMissingTemplates += missingTemplates.length;
            }
        }

        return results;
    }

    displayDetailedAnalysis() {
        console.log('\n📊 4. 详细分析结果');
        console.log('='.repeat(80));
        
        // 总体统计
        console.log(`📈 总体统计:`);
        console.log(`   总项目数: ${this.stats.totalProjects}`);
        console.log(`   模板完整项目: ${this.stats.projectsWithCompleteTemplates} (${(this.stats.projectsWithCompleteTemplates/this.stats.totalProjects*100).toFixed(1)}%)`);
        console.log(`   需要补充项目: ${this.stats.projectsNeedingTemplates} (${(this.stats.projectsNeedingTemplates/this.stats.totalProjects*100).toFixed(1)}%)`);
        console.log(`   总缺失模板数: ${this.stats.totalMissingTemplates}`);
        
        // 理论vs实际
        const theoreticalTotal = this.stats.totalProjects * this.activeTemplates.length;
        const actualTotal = theoreticalTotal - this.stats.totalMissingTemplates;
        const overallCompletion = (actualTotal / theoreticalTotal * 100).toFixed(2);
        
        console.log(`\n📊 完整度分析:`);
        console.log(`   理论模板总数: ${theoreticalTotal} (${this.stats.totalProjects} × ${this.activeTemplates.length})`);
        console.log(`   实际模板总数: ${actualTotal}`);
        console.log(`   整体完成度: ${overallCompletion}%`);

        // 显示需要补充的项目详情
        const incompleteProjects = this.detailedResults.filter(r => !r.isComplete);
        
        if (incompleteProjects.length > 0) {
            console.log(`\n⚠️  需要补充模板的项目详情 (前20个):`);
            console.log('-'.repeat(80));
            
            incompleteProjects
                .sort((a, b) => b.missingCount - a.missingCount)
                .slice(0, 20)
                .forEach((result, i) => {
                    const project = result.project;
                    const projectName = project.name_zh || project.name || `项目${i+1}`;
                    
                    console.log(`${String(i + 1).padStart(3, ' ')}. ${projectName.substring(0, 30).padEnd(30, ' ')} | 缺失: ${String(result.missingCount).padStart(2, ' ')}/${this.activeTemplates.length} | 完成度: ${result.completionRate.padStart(5, ' ')}%`);
                    console.log(`     项目ID: ${project.id}`);
                    console.log(`     缺失模板: ${result.missingTemplates.map(t => t.name_zh).join(', ')}`);
                    console.log('');
                });

            if (incompleteProjects.length > 20) {
                console.log(`     ... 还有 ${incompleteProjects.length - 20} 个项目需要补充模板`);
            }
        }

        // 按缺失模板类型统计
        this.displayMissingTemplateStats();
    }

    displayMissingTemplateStats() {
        console.log(`\n📋 缺失模板类型统计:`);
        console.log('-'.repeat(50));
        
        const templateMissingCount = new Map();
        
        this.detailedResults.forEach(result => {
            result.missingTemplates.forEach(template => {
                const count = templateMissingCount.get(template.id) || 0;
                templateMissingCount.set(template.id, count + 1);
            });
        });

        // 按缺失次数排序
        const sortedMissing = Array.from(templateMissingCount.entries())
            .map(([templateId, count]) => {
                const template = this.activeTemplates.find(t => t.id === templateId);
                return { template, count };
            })
            .sort((a, b) => b.count - a.count);

        sortedMissing.forEach((item, i) => {
            const percentage = (item.count / this.stats.projectsNeedingTemplates * 100).toFixed(1);
            console.log(`${String(i + 1).padStart(2, ' ')}. ${item.template.name_zh.padEnd(25, ' ')} | 缺失: ${String(item.count).padStart(4, ' ')} 次 (${percentage}%)`);
        });
    }

    async executeTemplateGeneration() {
        console.log('\n🚀 5. 开始执行模板补充生成 (调用现有API)');
        console.log('='.repeat(80));
        
        const incompleteProjects = this.detailedResults.filter(r => !r.isComplete);
        
        if (incompleteProjects.length === 0) {
            console.log('✅ 所有项目模板都已完整，无需补充生成！');
            return;
        }

        console.log(`📋 需要处理 ${incompleteProjects.length} 个项目，共 ${this.stats.totalMissingTemplates} 个模板`);
        console.log(`🔧 使用现有API: ${this.apiConfig.baseUrl}`);
        console.log(`⏱️  预计耗时: ${Math.ceil(this.stats.totalMissingTemplates * 3 / 60)} 分钟\n`);
        
        let processedProjects = 0;
        let processedTemplates = 0;
        
        for (const result of incompleteProjects) {
            processedProjects++;
            const project = result.project;
            const projectName = project.name_zh || project.name || '未命名项目';
            
            console.log(`\n🔄 [${processedProjects}/${incompleteProjects.length}] 处理项目: ${projectName}`);
            console.log(`   项目ID: ${project.id}`);
            console.log(`   需要生成: ${result.missingCount} 个模板`);
            
            // 按模板分组调用API
            for (const template of result.missingTemplates) {
                processedTemplates++;
                
                try {
                    console.log(`   📝 [${processedTemplates}/${this.stats.totalMissingTemplates}] 生成: ${template.name_zh}...`);
                    
                    const apiResult = await this.callBatchGenerateAPI(project.id, template.id);
                    
                    if (apiResult.success) {
                        console.log(`   ✅ 成功生成: ${template.name_zh} (${JSON.stringify(apiResult.stats || {})})`);
                        this.stats.generatedTemplates += apiResult.stats?.generated || 1;
                    } else {
                        throw new Error(apiResult.error || '未知API错误');
                    }
                    
                    this.stats.apiCalls++;
                    
                    // 控制API调用频率
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } catch (error) {
                    console.error(`   ❌ 生成失败 ${template.name_zh}: ${error.message}`);
                    this.stats.errors++;
                }
            }
            
            const projectProgress = (processedProjects / incompleteProjects.length * 100).toFixed(1);
            const templateProgress = (processedTemplates / this.stats.totalMissingTemplates * 100).toFixed(1);
            console.log(`   📊 项目进度: ${projectProgress}% | 模板进度: ${templateProgress}%`);
        }
        
        console.log('\n✅ 模板补充生成完成！');
    }

    async callBatchGenerateAPI(projectId, templateId) {
        try {
            // 构建API调用参数
            const params = new URLSearchParams({
                user_id: this.apiConfig.userId,
                languages: 'zh,en',
                table: 'user_projects',
                batch_size: 1,
                template_batch_size: 1,
                max_time: 25000,
                project_id: projectId,
                template_ids: templateId,
                limit: 1
            });
            
            const url = `${this.apiConfig.baseUrl}?${params.toString()}`;
            
            // 使用curl调用API
            const curlCommand = `curl -s -X GET "${url}" -H "User-Agent: TemplateCompletion/1.0" --max-time 35`;
            
            console.log(`   🌐 API调用: 项目=${projectId.substring(0, 8)}..., 模板=${templateId.substring(0, 8)}...`);
            
            const result = execSync(curlCommand, { 
                encoding: 'utf8',
                timeout: this.apiConfig.timeout,
                maxBuffer: 1024 * 1024
            });
            
            const response = JSON.parse(result);
            
            if (response.success) {
                return response;
            } else {
                throw new Error(response.error || 'API返回失败状态');
            }
            
        } catch (error) {
            console.warn(`   ⚠️  API调用失败: ${error.message}`);
            throw error;
        }
    }

    generateFinalReport() {
        const endTime = new Date();
        const duration = Math.round((endTime - this.stats.startTime) / 1000);
        
        console.log('\n📊 6. 最终统计报告');
        console.log('='.repeat(80));
        console.log(`⏱️  执行时间: ${duration} 秒`);
        console.log(`📝 总项目数: ${this.stats.totalProjects}`);
        console.log(`✅ 完整项目: ${this.stats.projectsWithCompleteTemplates}`);
        console.log(`⚠️  需要补充: ${this.stats.projectsNeedingTemplates}`);
        console.log(`📋 缺失模板总数: ${this.stats.totalMissingTemplates}`);
        console.log(`🌐 API调用次数: ${this.stats.apiCalls}`);
        console.log(`🎯 成功生成: ${this.stats.generatedTemplates}`);
        console.log(`❌ 生成错误: ${this.stats.errors}`);
        
        if (this.stats.generatedTemplates > 0) {
            const successRate = ((this.stats.generatedTemplates / (this.stats.generatedTemplates + this.stats.errors)) * 100).toFixed(1);
            console.log(`📈 成功率: ${successRate}%`);
        }
        
        console.log('='.repeat(80));
        console.log('🎉 模板补充分析完成！');
        
        if (this.stats.generatedTemplates > 0) {
            console.log('\n💡 建议下一步操作:');
            console.log('1. 运行 enhanced-template-generator.mjs 生成HTML页面');
            console.log('2. 更新网站地图和导航');
            console.log('3. 验证生成的模板内容质量');
        }
    }
}

// 执行分析器
if (require.main === module) {
    new TemplateCompletionGenerator().run();
}

module.exports = TemplateCompletionGenerator; 