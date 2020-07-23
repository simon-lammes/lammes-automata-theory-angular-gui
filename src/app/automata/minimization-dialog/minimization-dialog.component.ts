import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder} from '@angular/forms';
import {AutomataService, Minimization} from '../automata.service';

@Component({
  selector: 'app-minimization-dialog',
  templateUrl: './minimization-dialog.component.html',
  styleUrls: ['./minimization-dialog.component.scss']
})
export class MinimizationDialogComponent {

  constructor(
    private readonly dialogRef: MatDialogRef<MinimizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: Minimization,
    private formBuilder: FormBuilder,
    private automataService: AutomataService
  ) { }

  cancel(): void {
    this.dialogRef.close();
  }

  doRenamingOperationsExist(): boolean {
    if (!this.data?.removedStates) {
      return false;
    }
    return Object.keys(this.data.renamingOperations).length > 0;
  }

  persistMinimization(): void {
    this.automataService.persistMinimization(this.data);
    this.dialogRef.close();
  }
}
