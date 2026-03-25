import { CommonModule } from '@angular/common';
import {
  Component,
  input,
  output,
} from '@angular/core';
import type { OrgUserView } from '@task-mgmt/data';
import { UserRole } from '@task-mgmt/data';
import type { TeamTreeNode } from './team-tree.types';

@Component({
  selector: 'app-team-org-branch',
  standalone: true,
  imports: [CommonModule, TeamOrgBranchComponent],
  templateUrl: './team-org-branch.component.html',
})
export class TeamOrgBranchComponent {
  readonly node = input.required<TeamTreeNode>();
  readonly UserRole = UserRole;
  readonly promote = output<OrgUserView>();
  readonly demote = output<OrgUserView>();
  readonly openPermissions = output<OrgUserView>();
}
