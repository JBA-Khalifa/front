import { ConfigsService } from './../../services/configs.service';
import { Component, HostListener } from '@angular/core';

import {
  animate,
  keyframes,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  AppPromptService,
  AppPromptState,
} from '../../services/app-prompt.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'm-appPrompt',
  templateUrl: './app-prompt.component.html',
  styleUrls: ['app-prompt.component.ng.scss'],
  animations: [
    trigger('fader', [
      state(
        'active',
        style({
          visibility: 'visible',
          height: 67,
        })
      ),
      state(
        'expanded',
        style({
          visibility: 'visible',
          height: '85vh',
        })
      ),
      state(
        'dismissed',
        style({
          visibility: 'hidden',
          maxHeight: 0,
          height: 0,
        })
      ),
      transition(':enter', [
        animate(
          '300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          keyframes([
            style({
              transform: 'translateY(300px)',
            }),
            style({
              transform: 'translateY(0px)',
            }),
          ])
        ),
      ]),
      transition('* => expanded', [
        animate(
          '450ms ease',
          keyframes([
            style({
              height: '*',
            }),
            style({ height: '85vh', visibility: 'visible' }),
          ])
        ),
      ]),
      transition('* => dismissed', [
        animate(
          '450ms ease',
          keyframes([
            style({
              opacity: 1,
              maxHeight: '*',
              height: '*',
            }),
            style({ opacity: 0 }),
            style({
              maxHeight: 0,
              visibility: 'hidden',
              height: 0,
            }),
          ])
        ),
      ]),
    ]),
  ],
})
export class AppPromptComponent {
  readonly cdnAssetsUrl: string;

  constructor(
    private service: AppPromptService,
    protected configs: ConfigsService
  ) {
    this.cdnAssetsUrl = this.configs.get('cdn_assets_url');
  }

  ngOnInit(): void {
    console.log('initing in component');
    if (this.service.hasAvailableApp()) {
      console.log('settings platform from component');
      this.service.setPlatform();
      console.log('opening...');
      this.service.open();
      console.log(this.service.platform$.getValue());
    }
  }

  /**
   * Get state from service.
   */
  get state$(): BehaviorSubject<AppPromptState> {
    return this.service.state$;
  }

  /**
   * Triggered on navigate click.
   */
  public onClick(): void {
    this.service.redirect();
  }

  /**
   * Triggered on close click.
   */
  public onClose(): void {
    this.service.close();
  }
}
