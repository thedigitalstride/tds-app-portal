import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@tds/ui';
import { tools, categories } from '@/lib/tools';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-neutral-500">
          Access your digital marketing tools and resources
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Tools</CardDescription>
            <CardTitle className="text-3xl">{tools.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Role</CardDescription>
            <CardTitle className="text-3xl capitalize">
              {session?.user?.role}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Domain</CardDescription>
            <CardTitle className="text-xl">@thedigitalstride.co.uk</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">Your Tools</h2>
        <p className="text-sm text-neutral-500">
          Click on a tool to get started
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.id} href={tool.href}>
            <Card className="h-full transition-all hover:border-neutral-300 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                    <tool.icon className="h-5 w-5 text-neutral-700" />
                  </div>
                  {tool.isNew && <Badge variant="secondary">New</Badge>}
                </div>
                <CardTitle className="mt-4">{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm font-medium text-neutral-900">
                  Open tool
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Coming Soon Placeholder */}
        <Card className="h-full border-dashed bg-neutral-50">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200">
              <span className="text-lg">+</span>
            </div>
            <CardTitle className="mt-4 text-neutral-400">More Coming Soon</CardTitle>
            <CardDescription>
              New tools are being developed to help streamline your workflow
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
