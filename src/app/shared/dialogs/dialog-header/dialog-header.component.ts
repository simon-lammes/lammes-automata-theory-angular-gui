import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-dialog-header',
  templateUrl: './dialog-header.component.html',
  styleUrls: ['./dialog-header.component.scss']
})
export class DialogHeaderComponent {
  @Input() heading: string;
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  cancel(): void {
    this.cancelled.emit(true);
  }
}
