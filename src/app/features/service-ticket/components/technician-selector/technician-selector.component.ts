import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Technician {
  id: string;
  name: string;
  currentWorkload?: number;
  certifications?: string[];
}

@Component({
  selector: 'app-technician-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './technician-selector.component.html',
  styleUrls: ['./technician-selector.component.css']
})
export class TechnicianSelectorComponent {
  @Input() technicians: Technician[] = [];
  @Input() selectedTechnicianId: string | undefined;
  @Input() estimatedCompletionMinutes: number = 0;
  @Output() technicianSelected = new EventEmitter<string>();

  selectTechnician(technicianId: string): void {
    this.technicianSelected.emit(technicianId);
  }

  clearSelection(): void {
    this.technicianSelected.emit('');
  }

  getWorkloadClass(workload: number | undefined): string {
    if (!workload) return 'workload-low';
    if (workload < 3) return 'workload-low';
    if (workload < 6) return 'workload-medium';
    return 'workload-high';
  }

  getWorkloadLabel(workload: number | undefined): string {
    if (!workload) return 'Available';
    if (workload < 3) return 'Light Load';
    if (workload < 6) return 'Moderate Load';
    return 'Heavy Load';
  }

  formatEstimatedTime(minutes: number): string {
    if (minutes === 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }
}
