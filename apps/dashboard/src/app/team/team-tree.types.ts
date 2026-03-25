import type { OrganizationTreeRow, OrgUserView } from '@task-mgmt/data';

export interface TeamTreeNode {
  id: string;
  name: string;
  users: OrgUserView[];
  children: TeamTreeNode[];
}

export function buildTeamTree(
  orgs: OrganizationTreeRow[],
  users: OrgUserView[]
): TeamTreeNode[] {
  const usersByOrg = new Map<string, OrgUserView[]>();
  for (const u of users) {
    const list = usersByOrg.get(u.organizationId) ?? [];
    list.push(u);
    usersByOrg.set(u.organizationId, list);
  }
  const nodeMap = new Map<string, TeamTreeNode>();
  for (const o of orgs) {
    nodeMap.set(o.id, {
      id: o.id,
      name: o.name,
      users: [...(usersByOrg.get(o.id) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      children: [],
    });
  }
  const roots: TeamTreeNode[] = [];
  for (const o of orgs) {
    const node = nodeMap.get(o.id);
    if (!node) continue;
    const pid = o.parentOrganizationId;
    if (pid && nodeMap.has(pid)) {
      nodeMap.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (n: TeamTreeNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.children.forEach(sortRecursive);
  };
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(sortRecursive);
  return roots;
}
