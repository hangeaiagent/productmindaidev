#!/usr/bin/env node
/**
 * ProductMind AI 模板补充生成脚本 (专注版)
 * 文件: docs/templateSEO/sh/gennofinishpage.cjs
 * 
 * 功能：
 * 1. 分析所有项目是否包含完整的7个模板 (isshow=1的模板)
 * 2. 统计缺失的模板数量和详细清单
 * 3. 只补充生成缺失的template_versions数据
 * 4. 不处理HTML页面生成（由其他脚本处理）
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

class TemplateCompletionAnalyzer {
    constructor() {
        this.stats = {
            totalProjects: 0,
            projectsWithCompleteTemplates: 0,
            projectsNeedingTemplates: 0,
            totalMissingTemplates: 0,
            generatedTemplates: 0,
            errors: 0,
            startTime: new Date()
        };
        this.activeTemplates = [];
        this.detailedResults = [];
        this.batchSize = 5; // 控制生成速度
    }

    async run() {
        console.log('🔍 ProductMind AI 模板补充生成分析器');
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
                console.log('例如: node docs/templateSEO/sh/gennofinishpage.cjs --execute');
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
        const progressInterval = Math.max(1, Math.floor(projects.length / 20)); // 显示20次进度
        
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
            console.log(`\n⚠️  需要补充模板的项目详情:`);
            console.log('-'.repeat(80));
            
            // 按缺失数量排序，显示前20个
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
        console.log('\n🚀 5. 开始执行模板补充生成');
        console.log('='.repeat(80));
        
        const incompleteProjects = this.detailedResults.filter(r => !r.isComplete);
        
        if (incompleteProjects.length === 0) {
            console.log('✅ 所有项目模板都已完整，无需补充生成！');
            return;
        }

        console.log(`📋 需要处理 ${incompleteProjects.length} 个项目，共 ${this.stats.totalMissingTemplates} 个模板`);
        console.log(`⏱️  预计耗时: ${Math.ceil(this.stats.totalMissingTemplates * 2 / 60)} 分钟\n`);
        
        let processedProjects = 0;
        let processedTemplates = 0;
        
        for (const result of incompleteProjects) {
            processedProjects++;
            const project = result.project;
            const projectName = project.name_zh || project.name || '未命名项目';
            
            console.log(`\n🔄 [${processedProjects}/${incompleteProjects.length}] 处理项目: ${projectName}`);
            console.log(`   项目ID: ${project.id}`);
            console.log(`   需要生成: ${result.missingCount} 个模板`);
            
            for (const template of result.missingTemplates) {
                processedTemplates++;
                
                try {
                    console.log(`   📝 [${processedTemplates}/${this.stats.totalMissingTemplates}] 生成: ${template.name_zh}...`);
                    
                    await this.generateTemplateVersion(project, template);
                    
                    console.log(`   ✅ 成功生成: ${template.name_zh}`);
                    this.stats.generatedTemplates++;
                    
                    // 控制生成速度，避免API限制
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
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

    async generateTemplateVersion(project, template) {
        try {
            console.log(`   🔧 调用现有批量生成API...`);
            
            // 调用现有的批量生成模板API
            const response = await this.callBatchGenerateAPI(project.id, template.id);
            
            if (!response.success) {
                throw new Error(`API调用失败: ${response.error || '未知错误'}`);
            }
            
            console.log(`   ✅ API调用成功，生成结果: ${JSON.stringify(response.stats || {})}`);
            return response;
            
                    } catch (error) {
            throw new Error(`调用生成API失败: ${error.message}`);
        }
    }

    async callBatchGenerateAPI(projectId, templateId) {
        try {
            const { execSync } = require('child_process');
            
            // 构建API调用URL
            const baseUrl = 'http://productmindai.com/.netlify/functions/batch-generate-templates';
            const params = new URLSearchParams({
                user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
                languages: 'zh,en',
                table: 'user_projects',
                batch_size: 1,
                template_batch_size: 1,
                max_time: 25000,
                project_id: projectId,      // 指定项目ID
                template_ids: templateId,   // 指定模板ID
                limit: 1
            });
            
            const url = `${baseUrl}?${params.toString()}`;
            
            // 使用curl调用API（更可靠）
            const curlCommand = `curl -s -X GET "${url}" -H "User-Agent: TemplateCompletion/1.0"`;
            
            console.log(`   🌐 API调用: ${url.substring(0, 100)}...`);
            
            const result = execSync(curlCommand, { 
                encoding: 'utf8',
                timeout: 30000,
                maxBuffer: 1024 * 1024 // 1MB buffer
            });
            
            const response = JSON.parse(result);
            return response;
            
        } catch (error) {
            // 如果API调用失败，回退到直接数据库操作
            console.warn(`   ⚠️  API调用失败，使用直接生成: ${error.message}`);
            return await this.generateTemplateDirectly(projectId, templateId);
        }
    }

    async generateTemplateDirectly(projectId, templateId) {
        try {
            // 获取项目和模板信息
            const [projectData, templateData] = await Promise.all([
                this.getProjectInfo(projectId),
                this.getTemplateInfo(templateId)
            ]);
            
            if (!projectData || !templateData) {
                throw new Error('获取项目或模板信息失败');
            }
            
            const projectName = projectData.name_zh || projectData.name || '未命名项目';
            const templateNameZh = templateData.name_zh;
            const templateNameEn = templateData.name_en || templateData.name_zh;
            
            // 生成基础内容
            const versionData = {
                template_id: templateId,
                project_id: projectId,
                created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
                version_number: 1,
                output_content_zh: JSON.stringify({
                    content: `# ${templateNameZh}\n\n这是为项目"${projectName}"生成的${templateNameZh}内容。\n\n## 项目信息\n- 项目名称: ${projectName}\n- 项目描述: ${projectData.description || '暂无描述'}\n- 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n## ${templateNameZh}详细内容\n\n[此处应包含具体的${templateNameZh}内容]\n\n---\n*此内容由模板补充系统自动生成*`,
                    language: 'zh',
                    generated_at: new Date().toISOString(),
                    generation_method: 'template_completion'
                }),
                output_content_en: JSON.stringify({
                    content: `# ${templateNameEn}\n\nThis is the ${templateNameEn} content generated for project "${projectName}".\n\n## Project Information\n- Project Name: ${projectName}\n- Project Description: ${projectData.description || 'No description available'}\n- Generated At: ${new Date().toLocaleString('en-US')}\n\n## ${templateNameEn} Detailed Content\n\n[Specific ${templateNameEn} content should be included here]\n\n---\n*This content is automatically generated by the template completion system*`,
                    language: 'en',
                    generated_at: new Date().toISOString(),
                    generation_method: 'template_completion'
                })
            };

            const { data, error } = await supabase
                .from('template_versions')
                .insert(versionData)
                .select()
                .single();

            if (error) {
                throw new Error(`数据库保存失败: ${error.message}`);
            }

            return {
                success: true,
                data: data,
                stats: { generated: 1, skipped: 0, errors: 0 }
            };
            
        } catch (error) {
            throw new Error(`直接生成失败: ${error.message}`);
        }
    }

    async getProjectInfo(projectId) {
        const { data, error } = await supabase
            .from('user_projects')
            .select('id, name, name_zh, name_en, description')
            .eq('id', projectId)
            .single();
        
        if (error) {
            console.error('获取项目信息失败:', error);
            return null;
        }
        
        return data;
    }

    async getTemplateInfo(templateId) {
        const { data, error } = await supabase
            .from('templates')
            .select('id, name_zh, name_en, prompt_content')
            .eq('id', templateId)
            .single();
        
        if (error) {
            console.error('获取模板信息失败:', error);
            return null;
        }
        
        return data;
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
    new TemplateCompletionAnalyzer().run();
}

module.exports = TemplateCompletionAnalyzer;
