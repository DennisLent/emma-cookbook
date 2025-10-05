import { Pipe, PipeTransform } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TranslateService } from './translate.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: TranslateService) {}
  transform(key: string): string {
    return this.i18n.t(key);
  }
}

