import React from 'react';
import TemplateList from '../components/TemplateList';
import ProjectSelector from '../components/ProjectSelector';

const Dashboard: React.FC = () => {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="container mx-auto py-6 px-4">
        <ProjectSelector />
        <TemplateList />
      </div>
    </div>
  );
};

export default Dashboard;