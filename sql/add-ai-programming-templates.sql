-- ===========================================
-- 添加AI编程工具文档分类和模板
-- ===========================================

-- 1. 首先更新现有分类的排序编号，为新分类腾出第一位
UPDATE template_categories 
SET no = no + 1, updated_at = now() 
WHERE no >= 1;

-- 2. 插入新的分类：集成AI编程工具文档
INSERT INTO template_categories (
  id, 
  parent_id, 
  name_en, 
  name_zh, 
  description_en, 
  description_zh, 
  no, 
  created_at, 
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Integrated AI Programming Tool Documentation', 
  '集成AI编程工具文档', 
  'Documentation templates for AI-powered development tools and platforms', 
  '为AI驱动的开发工具和平台提供文档模板', 
  1, 
  now(), 
  now()
);

-- 3. 插入对应的5个模板
INSERT INTO templates (
  id, 
  category_id, 
  name_en, 
  name_zh, 
  description_en, 
  description_zh, 
  prompt_content, 
  no, 
  created_at, 
  updated_at
) VALUES 

-- 3.1 项目需求文档
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Project Requirements Document',
  '项目需求文档',
  'Generate comprehensive project requirements documentation for AI programming tools',
  '为AI编程工具生成全面的项目需求文档',
  'As an AI programming tool documentation expert, please create a comprehensive Project Requirements Document (PRD) for the given project.

**Document Structure:**

## 1. Project Overview
- Project name and description
- Target users and use cases
- Core objectives and success metrics

## 2. Functional Requirements
- Core features and capabilities
- User workflows and interactions
- AI/ML functionality specifications
- Integration requirements

## 3. Non-Functional Requirements
- Performance specifications
- Scalability requirements
- Security and privacy considerations
- Reliability and availability targets

## 4. Technical Constraints
- Technology stack limitations
- Platform compatibility
- Resource constraints
- Compliance requirements

## 5. User Stories and Acceptance Criteria
- Detailed user stories
- Acceptance criteria for each feature
- Priority levels and dependencies

**Output Requirements:**
- Professional and structured format
- Clear and actionable requirements
- Include both technical and business perspectives
- Provide specific measurable criteria

请根据以下项目信息生成详细的需求文档：
项目名称：{project_name}
项目描述：{project_description}
主要功能：{main_features}

请用中文输出完整的项目需求文档。',
  1,
  now(),
  now()
),

-- 3.2 技术栈文档
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Tech Stack Document',
  '技术栈文档',
  'Create detailed technical stack documentation for AI programming platforms',
  '为AI编程平台创建详细的技术栈文档',
  'As a technical architect for AI programming tools, please create a comprehensive Tech Stack Document.

**Document Structure:**

## 1. Technology Overview
- Architecture philosophy and principles
- Technology selection criteria
- Overall system design approach

## 2. Frontend Technologies
- Programming languages and frameworks
- UI/UX libraries and tools
- Build tools and bundlers
- Testing frameworks

## 3. Backend Technologies
- Server-side languages and frameworks
- Database systems and data storage
- API design and protocols
- Microservices architecture

## 4. AI/ML Technologies
- Machine learning frameworks
- AI model deployment platforms
- Data processing pipelines
- Model versioning and management

## 5. Infrastructure and DevOps
- Cloud platforms and services
- Containerization and orchestration
- CI/CD pipelines
- Monitoring and logging

## 6. Security and Compliance
- Authentication and authorization
- Data encryption and protection
- Security scanning tools
- Compliance frameworks

**Output Requirements:**
- Detailed technology justifications
- Version specifications
- Integration patterns
- Best practices and guidelines

请根据以下项目信息生成技术栈文档：
项目类型：{project_type}
项目规模：{project_scale}
性能要求：{performance_requirements}

请用中文输出完整的技术栈文档。',
  2,
  now(),
  now()
),

-- 3.3 前端开发指南文档
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Frontend Guideline Document',
  '前端开发指南文档',
  'Generate frontend development guidelines for AI programming tool interfaces',
  '为AI编程工具界面生成前端开发指南',
  'As a senior frontend architect specializing in AI tools, please create a comprehensive Frontend Development Guideline Document.

**Document Structure:**

## 1. Development Standards
- Code style and formatting guidelines
- Naming conventions and best practices
- File and folder organization
- Documentation requirements

## 2. UI/UX Guidelines
- Design system and component library
- Responsive design principles
- Accessibility standards (WCAG)
- User interaction patterns

## 3. Component Architecture
- Component design patterns
- State management strategies
- Props and event handling
- Reusable component guidelines

## 4. Performance Guidelines
- Code splitting and lazy loading
- Bundle optimization techniques
- Rendering performance best practices
- Memory management strategies

## 5. Testing Standards
- Unit testing guidelines
- Integration testing approaches
- E2E testing strategies
- Testing tools and frameworks

## 6. Build and Deployment
- Development workflow
- Build optimization
- Environment configuration
- Deployment strategies

**Output Requirements:**
- Practical code examples
- Clear implementation guidelines
- Tool-specific configurations
- Performance benchmarks

请根据以下项目信息生成前端开发指南：
项目框架：{frontend_framework}
目标用户：{target_users}
性能要求：{performance_targets}

请用中文输出完整的前端开发指南文档。',
  3,
  now(),
  now()
),

-- 3.4 后端架构文档
(
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Backend Structure Document',
  '后端架构文档',
  'Create backend architecture documentation for AI programming tool systems',
  '为AI编程工具系统创建后端架构文档',
  'As a backend architecture expert for AI systems, please create a comprehensive Backend Structure Document.

**Document Structure:**

## 1. System Architecture
- Overall system design and patterns
- Service architecture (monolith/microservices)
- Communication protocols and patterns
- Data flow and processing pipelines

## 2. API Design
- RESTful API guidelines
- GraphQL implementation (if applicable)
- API versioning strategies
- Request/response patterns

## 3. Database Architecture
- Database design principles
- Schema design and relationships
- Data modeling for AI/ML workloads
- Query optimization strategies

## 4. Service Components
- Core service definitions
- Business logic organization
- Integration patterns
- Third-party service connections

## 5. Scalability and Performance
- Horizontal and vertical scaling strategies
- Caching mechanisms
- Load balancing approaches
- Performance monitoring

## 6. Data Processing
- AI/ML model integration
- Data pipeline architecture
- Batch and real-time processing
- Model serving strategies

**Output Requirements:**
- Detailed architecture diagrams (textual description)
- Implementation guidelines
- Scalability considerations
- Security integration points

请根据以下项目信息生成后端架构文档：
系统规模：{system_scale}
数据处理需求：{data_requirements}
集成需求：{integration_needs}

请用中文输出完整的后端架构文档。',
  4,
  now(),
  now()
),

-- 3.5 安全指南文档
(
  '10000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Security Guideline Document',
  '安全指南文档',
  'Generate security guidelines for AI programming tool development and deployment',
  '为AI编程工具开发和部署生成安全指南',
  'As a cybersecurity expert specializing in AI systems, please create a comprehensive Security Guideline Document.

**Document Structure:**

## 1. Security Framework
- Security principles and policies
- Threat modeling approach
- Risk assessment methodology
- Compliance requirements

## 2. Authentication and Authorization
- User authentication strategies
- Multi-factor authentication implementation
- Role-based access control (RBAC)
- API authentication and authorization

## 3. Data Security
- Data classification and handling
- Encryption at rest and in transit
- Data privacy and anonymization
- Secure data storage practices

## 4. Application Security
- Secure coding practices
- Input validation and sanitization
- SQL injection prevention
- Cross-site scripting (XSS) protection

## 5. Infrastructure Security
- Network security configurations
- Container and cloud security
- Secrets management
- Security monitoring and logging

## 6. AI/ML Security
- Model security and integrity
- Adversarial attack prevention
- Data poisoning protection
- Model privacy considerations

## 7. Incident Response
- Security incident procedures
- Breach notification protocols
- Recovery and remediation plans
- Forensic investigation guidelines

**Output Requirements:**
- Actionable security controls
- Implementation checklists
- Security testing procedures
- Compliance mapping

请根据以下项目信息生成安全指南文档：
项目类型：{project_type}
数据敏感级别：{data_sensitivity}
合规要求：{compliance_requirements}

请用中文输出完整的安全指南文档。',
  5,
  now(),
  now()
);

-- ===========================================
-- 验证插入结果
-- ===========================================

-- 查看新分类
SELECT id, name_en, name_zh, no 
FROM template_categories 
ORDER BY no;

-- 查看新分类下的模板
SELECT t.id, t.name_en, t.name_zh, t.no, tc.name_zh as category_name
FROM templates t
JOIN template_categories tc ON t.category_id = tc.id
WHERE tc.id = '00000000-0000-0000-0000-000000000001'
ORDER BY t.no;

-- ===========================================
-- 备注说明
-- ===========================================
/*
新增内容说明：
1. 分类：集成AI编程工具文档 (排序第一位)
2. 5个模板：
   - 项目需求文档
   - 技术栈文档  
   - 前端开发指南文档
   - 后端架构文档
   - 安全指南文档

特点：
- 双语支持（中英文）
- 详细的提示词模板
- 专门针对AI编程工具场景
- 包含项目信息占位符
- 结构化输出要求
*/ 