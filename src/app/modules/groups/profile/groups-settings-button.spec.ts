import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { DebugElement } from '@angular/core';

import { GroupsSettingsButton } from './groups-settings-button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Client } from '../../../services/api/client';
import { By } from '@angular/platform-browser';
import { Session } from '../../../services/session';
import { clientMock } from '../../../../tests/client-mock.spec';
import { sessionMock } from '../../../../tests/session-mock.spec';
import { MockComponent, MockDirective, MockService } from '../../../utils/mock';
import { OverlayModalService } from '../../../services/ux/overlay-modal';
import { overlayModalServiceMock } from '../../../../tests/overlay-modal-service-mock.spec';
import { GroupsService } from '../groups.service';
import { FormToastService } from '../../../common/services/form-toast.service';

let groupConfig = {
  countMembers: Promise.resolve(1),
};

let groupsServiceMock: any = MockService(GroupsService, groupConfig);

describe('GroupsSettingsButton', () => {
  let comp: GroupsSettingsButton;
  let fixture: ComponentFixture<GroupsSettingsButton>;

  function getButton(): DebugElement {
    return fixture.debugElement.query(By.css('button'));
  }

  function getMenuItem(i: number): DebugElement {
    return fixture.debugElement.query(
      By.css(`.minds-dropdown-menu .mdl-menu__item:nth-child(${i})`)
    );
  }

  function getDeleteGroupItem(): DebugElement | null {
    return fixture.debugElement.query(
      By.css(
        `.minds-dropdown-menu .mdl-menu__item.m-groups-settings-dropdown__item--deleteGroup`
      )
    );
  }

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [
          MockDirective({ selector: '[mdl]', inputs: ['mdl'] }),
          MockComponent({
            selector: 'm-modal',
            template: '<ng-content></ng-content>',
            inputs: ['open'],
            outputs: ['closed'],
          }),
          MockComponent({
            selector: 'm-nsfw-selector',
            inputs: ['selected'],
            outputs: ['selected'],
          }),
          GroupsSettingsButton,
        ],
        imports: [RouterTestingModule, FormsModule],
        providers: [
          { provide: GroupsService, useValue: groupsServiceMock },
          { provide: Client, useValue: clientMock },
          { provide: Session, useValue: sessionMock },
          { provide: OverlayModalService, useValue: overlayModalServiceMock },
          {
            provide: FormToastService,
            useValue: MockService(FormToastService),
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    jasmine.MAX_PRETTY_PRINT_DEPTH = 2;
    jasmine.clock().uninstall();
    jasmine.clock().install();
    fixture = TestBed.createComponent(GroupsSettingsButton);

    comp = fixture.componentInstance;

    comp._group = {
      guid: '1234',
      'is:muted': false,
      'is:creator': true,
    };

    clientMock.response = {};

    fixture.detectChanges();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should have a button and a menu', () => {
    const button = getButton();

    expect(button).not.toBeNull();
    expect(button.nativeElement.textContent).toContain('settings');

    expect(
      fixture.debugElement.query(By.css('.minds-dropdown-menu'))
    ).not.toBeNull();
  });

  it('should have button that lets you toggle the menu', () => {
    const menu = fixture.debugElement.query(By.css('.minds-dropdown-menu'));
    expect(menu.nativeElement.hidden).toBeTruthy();

    getButton().nativeElement.click();

    fixture.detectChanges();

    expect(menu.nativeElement.hidden).toBeFalsy();
  });

  xit('should have an option to mute / unmute the group', fakeAsync(() => {
    const mute = getMenuItem(1);
    const unmute = getMenuItem(2);

    expect(mute).not.toBeNull();
    expect(mute.nativeElement.textContent).toContain('Disable notifications');
    expect(mute.nativeElement.hidden).toBeFalsy();

    expect(unmute).not.toBeNull();
    expect(unmute.nativeElement.textContent).toContain('Enable notifications');
    expect(unmute.nativeElement.hidden).toBeTruthy();

    mute.nativeElement.click();

    fixture.detectChanges();
    jasmine.clock().tick(10);

    expect(groupsServiceMock.muteNotifications).toHaveBeenCalled();

    expect(mute.nativeElement.hidden).toBeTruthy();
    expect(unmute.nativeElement.hidden).toBeFalsy();
  }));

  xit('should have an option to feature / unfeature the group', fakeAsync(() => {
    const feature = getMenuItem(3);

    expect(feature).not.toBeNull();
    expect(feature.nativeElement.textContent).toContain('Feature');

    feature.nativeElement.click();
    expect(comp.featureModalOpen).toBeTruthy();

    clientMock.response['api/v1/admin/feature/1234/not-selected'] = {
      status: 'success',
    };

    const modalButton = fixture.debugElement.query(
      By.css('m-modal .m-button-feature-modal button.mdl-button')
    );
    expect(modalButton).not.toBeNull();
    expect(modalButton.nativeElement.textContent).toContain('Feature');
    modalButton.nativeElement.click();

    fixture.detectChanges();
    jasmine.clock().tick(10);

    expect(clientMock.put).toHaveBeenCalled();
    expect(clientMock.put.calls.mostRecent().args[0]).toBe(
      'api/v1/admin/feature/1234/not-selected'
    );

    expect(comp.group.featured).toBeTruthy();

    const unfeature = getMenuItem(3);

    expect(unfeature).not.toBeNull();
    expect(unfeature.nativeElement.textContent).toContain('Unfeature');

    clientMock.response['api/v1/admin/feature/1234'] = { status: 'success' };

    unfeature.nativeElement.click();
    expect(clientMock.delete).toHaveBeenCalled();
    expect(clientMock.delete.calls.mostRecent().args[0]).toBe(
      'api/v1/admin/feature/1234'
    );
  }));

  it('should have an option to report', () => {
    const report = fixture.debugElement.query(
      By.css(
        `.minds-dropdown-menu .mdl-menu__item.m-groups-settings-dropdown__item--report`
      )
    );
    expect(report).not.toBeNull();

    report.nativeElement.click();
    expect(overlayModalServiceMock.present).toHaveBeenCalled();
  });

  it('should have an option to delete the group only if the user is a creator', () => {
    const group = {
      guid: '1234',
      'is:muted': false,
      'is:creator': true,
    };

    const deleteGroup = getDeleteGroupItem();
    expect(deleteGroup).not.toBeNull();

    group['is:creator'] = false;
    comp._group = group;
    fixture.detectChanges();

    expect(getDeleteGroupItem()).toBeNull();
  });

  xit('should delete the group if there is one member', fakeAsync(() => {
    const deleteGroup = getDeleteGroupItem();

    deleteGroup.nativeElement.click();

    fixture.detectChanges();
    jasmine.clock().tick(10);

    const confirmButton = fixture.debugElement.query(
      By.css('m-modal button.mdl-button')
    );
    expect(confirmButton.nativeElement.textContent).toContain('Confirm');

    confirmButton.nativeElement.click();
    fixture.detectChanges();
    jasmine.clock().tick(10);

    expect(comp.group.deleted).toBeTruthy();
    expect(groupsServiceMock.deleteGroup).toHaveBeenCalled();
  }));

  it('should not allow group deletion if there is more than one member', fakeAsync(() => {
    groupConfig.countMembers = Promise.resolve(2);
    const deleteGroup = getDeleteGroupItem();

    deleteGroup.nativeElement.click();
    fixture.detectChanges();
    jasmine.clock().tick(10);

    expect(groupsServiceMock.countMembers).toHaveBeenCalled();
  }));
});
