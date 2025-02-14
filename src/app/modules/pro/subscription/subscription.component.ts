import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subscription, config } from 'rxjs';

import { Session } from '../../../services/session';
import { ProService } from '../pro.service';
import { OverlayModalService } from '../../../services/ux/overlay-modal';
import { WirePaymentHandlersService } from '../../wire/wire-payment-handlers.service';
import {
  UpgradeOptionCurrency,
  UpgradeOptionInterval,
} from '../../upgrades/upgrade-options.component';
import currency from '../../../helpers/currency';
import { ConfigsService } from '../../../common/services/configs.service';
import { FormToastService } from '../../../common/services/form-toast.service';
import { WireCreatorComponent } from '../../wire/v2/creator/wire-creator.component';
import * as moment from 'moment';

@Component({
  selector: 'm-pro--subscription',
  templateUrl: 'subscription.component.html',
  styleUrls: ['subscription.component.ng.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProSubscriptionComponent implements OnInit {
  readonly upgrades: any; // TODO add types

  @Output() onEnable: EventEmitter<any> = new EventEmitter();

  @Output() onDisable: EventEmitter<any> = new EventEmitter();

  interval: UpgradeOptionInterval = 'yearly';

  currency: UpgradeOptionCurrency = 'usd';

  paramSubscription: Subscription;

  isLoggedIn: boolean = false;

  inProgress: boolean = false;

  active: boolean;

  hasSubscription: boolean = false;

  expires: number = 0;

  criticalError: boolean = false;

  error: string = '';

  constructor(
    protected service: ProService,
    public session: Session,
    protected overlayModal: OverlayModalService,
    protected wirePaymentHandlers: WirePaymentHandlersService,
    protected cd: ChangeDetectorRef,
    protected route: ActivatedRoute,
    protected router: Router,
    configs: ConfigsService,
    protected toasterService: FormToastService
  ) {
    this.upgrades = configs.get('upgrades');
  }

  ngOnInit() {
    this.isLoggedIn = this.session.isLoggedIn();

    if (this.isLoggedIn) {
      this.load();
    }

    this.paramSubscription = this.route.queryParams.subscribe(
      (params: Params) => {
        this.currency = params.c || 'usd';
        this.interval = params.i || 'yearly';

        if (params.c || params.i) {
          if (this.currency === 'tokens') {
            this.interval = 'lifetime';
          }
          this.enable();
        }
      }
    );
  }

  async load() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      this.active = await this.service.isActive();
      this.hasSubscription = await this.service.hasSubscription();
      this.expires = await this.service.expires();
    } catch (e) {
      this.criticalError = true;
      this.error = (e && e.message) || 'Unknown error';
      this.toasterService.error(this.error);
    }

    this.inProgress = false;
    this.detectChanges();
  }

  async enable() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      this.overlayModal
        .create(
          WireCreatorComponent,
          await this.wirePaymentHandlers.get('pro'),
          {
            wrapperClass: 'm-modalV2__wrapper',
            default: {
              type: this.currency === 'usd' ? 'money' : 'tokens',
              upgradeType: 'pro',
              upgradeInterval: this.interval,
            },
            onComplete: () => {
              this.paymentComplete();
              this.overlayModal.dismiss();
            },
          }
        )
        .onDidDismiss(() => {
          this.inProgress = false;
          this.detectChanges();
        })
        .present();
    } catch (e) {
      this.active = false;
      this.hasSubscription = false;
      this.session.getLoggedInUser().pro = false;
      this.error = (e && e.message) || 'Unknown error';
      this.toasterService.error(this.error);
      this.inProgress = false;
    }

    this.detectChanges();
  }

  paymentComplete(): void {
    this.active = true;
    this.hasSubscription = true;
    this.session.getLoggedInUser().plus = true;
    this.onEnable.emit(Date.now());
    this.inProgress = false;
    this.detectChanges();

    this.toasterService.success('Welcome to Minds Pro');
  }

  async disable() {
    if (!confirm('Click OK if you want to cancel your Pro subscription...')) {
      return;
    }

    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      await this.service.disable();
      this.hasSubscription = false;
      this.onDisable.emit(Date.now());
    } catch (e) {
      this.error = (e && e.message) || 'Unknown error';
      this.toasterService.error(this.error);
      this.hasSubscription = true;
    }

    this.inProgress = false;
    this.detectChanges();
  }

  get pricing() {
    if (this.currency !== 'tokens') {
      if (this.interval === 'yearly') {
        return {
          amount: currency(
            this.upgrades.pro.yearly[this.currency] / 12,
            this.currency
          ),
          offerFrom: currency(
            this.upgrades.pro.monthly[this.currency],
            this.currency
          ),
          annualAmount: currency(
            this.upgrades.pro.yearly[this.currency],
            this.currency
          ),
        };
      } else if (this.interval === 'monthly') {
        return {
          amount: currency(
            this.upgrades.pro.monthly[this.currency],
            this.currency
          ),
          offerFrom: null,
          annualAmount: null,
        };
      }
    } else {
      this.interval = 'lifetime';
      return {
        amount: this.upgrades.pro.lifetime[this.currency],
        offerFrom: null,
        annualAmount: null,
      };
    }
  }

  get expiryString(): string {
    if (this.expires * 1000 <= Date.now()) {
      return '';
    }

    return moment(this.expires * 1000)
      .local()
      .format('h:mma [on] MMM Do, YYYY');
  }

  setCurrency(currency: UpgradeOptionCurrency) {
    this.currency = currency;
    if (this.currency === 'usd') {
      this.interval = 'yearly';
    } else if (this.currency === 'tokens') {
      this.interval = 'lifetime';
    }
  }

  setInterval(interval: UpgradeOptionInterval) {
    this.interval = interval;
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }

  ngOnDestroy() {
    this.paramSubscription.unsubscribe();
  }
}
